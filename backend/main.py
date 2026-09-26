from __future__ import annotations

import sqlite3
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "inventory.db"


@contextmanager
def database():
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database():
    with database() as connection:
        connection.executescript((BASE_DIR / "schema.sql").read_text(encoding="utf-8"))


class ProductInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=120)
    sku: str = Field(min_length=1, max_length=40)
    category: str = Field(min_length=1, max_length=60)
    quantity: int = Field(ge=0)
    min_quantity: int = Field(ge=0)
    unit_price: float = Field(ge=0)


class MovementInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    product_id: str
    movement_type: Literal["in", "out"]
    quantity: int = Field(gt=0)
    note: str = Field(default="", max_length=240)


app = FastAPI(title="Stockly API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    initialize_database()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/products")
def list_products(search: str = Query(default="", max_length=120)):
    with database() as connection:
        rows = connection.execute(
            """SELECT id, name, sku, category, quantity, min_quantity, unit_price, created_at
               FROM products
               WHERE name LIKE ? OR sku LIKE ? OR category LIKE ?
               ORDER BY name COLLATE NOCASE""",
            (f"%{search}%", f"%{search}%", f"%{search}%"),
        ).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/products", status_code=201)
def create_product(product: ProductInput):
    product_id = str(uuid.uuid4())
    try:
        with database() as connection:
            connection.execute(
                """INSERT INTO products (id, name, sku, category, quantity, min_quantity, unit_price)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (product_id, *product.model_dump().values()),
            )
            row = connection.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="Ce code SKU existe déjà.") from error
    return dict(row)


@app.put("/api/products/{product_id}")
def update_product(product_id: str, product: ProductInput):
    try:
        with database() as connection:
            result = connection.execute(
                """UPDATE products SET name = ?, sku = ?, category = ?, quantity = ?,
                   min_quantity = ?, unit_price = ? WHERE id = ?""",
                (*product.model_dump().values(), product_id),
            )
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Produit introuvable.")
            row = connection.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="Ce code SKU existe déjà.") from error
    return dict(row)


@app.delete("/api/products/{product_id}", status_code=204)
def delete_product(product_id: str):
    with database() as connection:
        result = connection.execute("DELETE FROM products WHERE id = ?", (product_id,))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Produit introuvable.")


@app.post("/api/movements", status_code=201)
def create_movement(movement: MovementInput):
    with database() as connection:
        connection.execute("BEGIN IMMEDIATE")
        product = connection.execute(
            "SELECT id, name, sku, quantity FROM products WHERE id = ?", (movement.product_id,)
        ).fetchone()
        if product is None:
            raise HTTPException(status_code=404, detail="Produit introuvable.")

        delta = movement.quantity if movement.movement_type == "in" else -movement.quantity
        new_quantity = product["quantity"] + delta
        if new_quantity < 0:
            raise HTTPException(status_code=400, detail="Stock insuffisant pour cette sortie.")

        connection.execute("UPDATE products SET quantity = ? WHERE id = ?", (new_quantity, product["id"]))
        movement_id = str(uuid.uuid4())
        connection.execute(
            """INSERT INTO movements (id, product_id, product_name, sku, movement_type, quantity, note)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (movement_id, product["id"], product["name"], product["sku"], movement.movement_type,
             movement.quantity, movement.note),
        )
        row = connection.execute("SELECT * FROM movements WHERE id = ?", (movement_id,)).fetchone()
    return dict(row)


@app.get("/api/movements")
def list_movements(limit: int = Query(default=8, ge=1, le=100)):
    with database() as connection:
        rows = connection.execute(
            "SELECT * FROM movements ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(row) for row in rows]

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from ..errors import APIError
from ..extensions import db
from ..models import Product
from ..validators import require_int, require_json, require_number, require_str

products_bp = Blueprint("products", __name__, url_prefix="/products")


@products_bp.post("")
def create_product():
    data = require_json(request.get_json(silent=True))
    name = require_str(data, "name", max_len=255)
    sku = require_str(data, "sku", max_len=100)
    price = require_number(data, "price", minimum=0)
    quantity = require_int(data, "quantity", minimum=0)

    if Product.query.filter_by(sku=sku).first():
        raise APIError("A product with this SKU already exists.", 409)

    product = Product(name=name, sku=sku, price=price, quantity=quantity)
    db.session.add(product)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise APIError("A product with this SKU already exists.", 409)
    return jsonify(product.to_dict()), 201


@products_bp.get("")
def list_products():
    products = Product.query.order_by(Product.id.desc()).all()
    return jsonify([p.to_dict() for p in products]), 200


@products_bp.get("/<int:product_id>")
def get_product(product_id: int):
    product = db.session.get(Product, product_id)
    if not product:
        raise APIError("Product not found.", 404)
    return jsonify(product.to_dict()), 200


@products_bp.put("/<int:product_id>")
def update_product(product_id: int):
    product = db.session.get(Product, product_id)
    if not product:
        raise APIError("Product not found.", 404)

    data = require_json(request.get_json(silent=True))
    name = require_str(data, "name", required=False, max_len=255)
    sku = require_str(data, "sku", required=False, max_len=100)
    price = require_number(data, "price", required=False, minimum=0)
    quantity = require_int(data, "quantity", required=False, minimum=0)

    if sku and sku != product.sku:
        if Product.query.filter_by(sku=sku).first():
            raise APIError("A product with this SKU already exists.", 409)
        product.sku = sku
    if name is not None:
        product.name = name
    if price is not None:
        product.price = price
    if quantity is not None:
        product.quantity = quantity

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise APIError("A product with this SKU already exists.", 409)
    return jsonify(product.to_dict()), 200


@products_bp.delete("/<int:product_id>")
def delete_product(product_id: int):
    product = db.session.get(Product, product_id)
    if not product:
        raise APIError("Product not found.", 404)
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted."}), 200

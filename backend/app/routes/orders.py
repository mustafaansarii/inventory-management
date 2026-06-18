
from decimal import Decimal

from flask import Blueprint, jsonify, request

from ..errors import APIError
from ..extensions import db
from ..models import Customer, Order, OrderItem, Product
from ..validators import require_int, require_json

orders_bp = Blueprint("orders", __name__, url_prefix="/orders")


@orders_bp.post("")
def create_order():
    data = require_json(request.get_json(silent=True))

    customer_id = require_int(data, "customer_id", minimum=1)
    customer = db.session.get(Customer, customer_id)
    if not customer:
        raise APIError("Customer not found.", 404)

    items = data.get("items")
    if not isinstance(items, list) or not items:
        raise APIError("'items' must be a non-empty list.", 422)

    # Validate each line and aggregate quantities per product.
    requested: dict[int, int] = {}
    for idx, raw in enumerate(items):
        if not isinstance(raw, dict):
            raise APIError(f"items[{idx}] must be an object.", 422)
        product_id = require_int(raw, "product_id", minimum=1)
        quantity = require_int(raw, "quantity", minimum=1)
        requested[product_id] = requested.get(product_id, 0) + quantity

    order = Order(customer_id=customer_id, total_amount=Decimal("0"))
    total = Decimal("0")

    for product_id, quantity in requested.items():
        product = db.session.get(Product, product_id)
        if not product:
            raise APIError(f"Product {product_id} not found.", 404)
        if product.quantity < quantity:
            raise APIError(
                f"Insufficient stock for '{product.name}'. "
                f"Available: {product.quantity}, requested: {quantity}.",
                409,
            )
        product.quantity -= quantity
        line_total = Decimal(str(product.price)) * quantity
        total += line_total
        order.items.append(
            OrderItem(product_id=product.id, quantity=quantity, unit_price=product.price)
        )

    order.total_amount = total
    db.session.add(order)
    db.session.commit()
    return jsonify(order.to_dict()), 201


@orders_bp.get("")
def list_orders():
    orders = Order.query.order_by(Order.id.desc()).all()
    return jsonify([o.to_dict(include_items=False) for o in orders]), 200


@orders_bp.get("/<int:order_id>")
def get_order(order_id: int):
    order = db.session.get(Order, order_id)
    if not order:
        raise APIError("Order not found.", 404)
    return jsonify(order.to_dict()), 200


@orders_bp.delete("/<int:order_id>")
def delete_order(order_id: int):
    order = db.session.get(Order, order_id)
    if not order:
        raise APIError("Order not found.", 404)

    # Restock products when an order is cancelled.
    for item in order.items:
        product = db.session.get(Product, item.product_id)
        if product:
            product.quantity += item.quantity

    db.session.delete(order)
    db.session.commit()
    return jsonify({"message": "Order cancelled and stock restored."}), 200

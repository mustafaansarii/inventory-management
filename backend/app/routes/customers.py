
from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from ..errors import APIError
from ..extensions import db
from ..models import Customer
from ..validators import require_json, require_str, validate_email

customers_bp = Blueprint("customers", __name__, url_prefix="/customers")


@customers_bp.post("")
def create_customer():
    data = require_json(request.get_json(silent=True))
    full_name = require_str(data, "full_name", max_len=255)
    email = validate_email(require_str(data, "email", max_len=255))
    phone = require_str(data, "phone", required=False, max_len=50)

    if Customer.query.filter_by(email=email).first():
        raise APIError("A customer with this email already exists.", 409)

    customer = Customer(full_name=full_name, email=email, phone=phone)
    db.session.add(customer)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise APIError("A customer with this email already exists.", 409)
    return jsonify(customer.to_dict()), 201


@customers_bp.get("")
def list_customers():
    customers = Customer.query.order_by(Customer.id.desc()).all()
    return jsonify([c.to_dict() for c in customers]), 200


@customers_bp.get("/<int:customer_id>")
def get_customer(customer_id: int):
    customer = db.session.get(Customer, customer_id)
    if not customer:
        raise APIError("Customer not found.", 404)
    return jsonify(customer.to_dict()), 200


@customers_bp.delete("/<int:customer_id>")
def delete_customer(customer_id: int):
    customer = db.session.get(Customer, customer_id)
    if not customer:
        raise APIError("Customer not found.", 404)
    db.session.delete(customer)
    db.session.commit()
    return jsonify({"message": "Customer deleted."}), 200

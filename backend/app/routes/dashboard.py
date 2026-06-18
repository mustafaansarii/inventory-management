
from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Customer, Order, Product

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")

LOW_STOCK_THRESHOLD = 5


@dashboard_bp.get("/summary")
def summary():
    threshold = request.args.get("low_stock_threshold", default=LOW_STOCK_THRESHOLD, type=int)

    total_products = db.session.query(Product).count()
    total_customers = db.session.query(Customer).count()
    total_orders = db.session.query(Order).count()
    low_stock = (
        Product.query.filter(Product.quantity <= threshold)
        .order_by(Product.quantity.asc())
        .all()
    )

    return (
        jsonify(
            {
                "total_products": total_products,
                "total_customers": total_customers,
                "total_orders": total_orders,
                "low_stock_threshold": threshold,
                "low_stock_count": len(low_stock),
                "low_stock_products": [p.to_dict() for p in low_stock],
            }
        ),
        200,
    )

from flask import Blueprint, render_template

# Define the blueprint
static_pages_bp = Blueprint(
    "static_pages", __name__, template_folder="../templates", static_folder="../static"
)

# Define routes
@static_pages_bp.route("/")
def index():
    return render_template("index.html")

@static_pages_bp.route("/about")
def about():
    return render_template("about.html")

@static_pages_bp.route("/contact")
def contact():
    return render_template("contact.html")

@static_pages_bp.route("/privacy")
def privacy():
    return render_template("privacy.html")

@static_pages_bp.route("/refund")
def refund():
    return render_template("refund.html")

@static_pages_bp.route("/terms")
def terms():
    return render_template("terms.html")

import azure.functions as func
from service.app import app as asgi_app
app=func.AsgiFunctionApp(app=asgi_app,http_auth_level=func.AuthLevel.ANONYMOUS)

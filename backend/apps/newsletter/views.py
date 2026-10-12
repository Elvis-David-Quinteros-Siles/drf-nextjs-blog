from rest_framework_api.views import StandardAPIView
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from django.conf import settings
from django.core.mail import EmailMessage

from utils.string_utils import sanitize_string, sanitize_phone_number, sanitize_email

from core.permissions import HasValidAPIKey
from .models import NewsletterUser, ContactMessage

class DuplicateEmailException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Duplicate email."  # Custom error message
    default_code = "duplicate_email"


class NewsletterSignupView(StandardAPIView):
    permission_classes = (HasValidAPIKey,)

    def post(self, request):
        email = request.data.get("email")

        if NewsletterUser.objects.filter(email=email).exists():
            # Raise the exception with the default detail "Duplicate email"
            raise DuplicateEmailException()

        newsletter_user = NewsletterUser(email=email)
        newsletter_user.save()
        return self.response("Successfully added user.")


class ContactUsView(StandardAPIView):
    permission_classes = (HasValidAPIKey,)

    def post(self, request):
        first_name = request.data.get("firstName", None)
        last_name = request.data.get("lastName", None)
        email = request.data.get("email", None)
        phone_number = request.data.get("phoneNumber", None)
        message = request.data.get("message", None)

        # Verificar que todos los campos están presentes
        if not all([first_name, last_name, email, phone_number, message]):
            raise ValidationError("All fields (firstName, lastName, email, phoneNumber, message) are required.")

        # Crear objeto
        ContactMessage.objects.create(
            first_name=sanitize_string(first_name),
            last_name=sanitize_string(last_name),
            email=sanitize_email(email),
            phone_number=sanitize_phone_number(phone_number),
            message=sanitize_string(message),
        )

        # Crear el contenido del correo
        subject = f"New Contact Message from {first_name} {last_name}"
        body = f"""
        You have received a new message from the contact form:

        Name: {first_name} {last_name}
        Email: {email}
        Phone: {phone_number}
        Message: {message}
        """
        # Se envía desde la cuenta del blog (el servidor de correo rechaza remitentes ajenos);
        # al responder, la respuesta va al visitante
        mail = EmailMessage(subject, body, to=[settings.CONTACT_EMAIL], reply_to=[sanitize_email(email)])

        # Enviar el correo
        try:
            mail.send()
        except Exception as e:
            return self.response(f"Error sending email: {str(e)}", status=status.HTTP_500_INTERNAL_SERVER_ERROR)


        return self.response("Successfully sent contact message.", status=201)

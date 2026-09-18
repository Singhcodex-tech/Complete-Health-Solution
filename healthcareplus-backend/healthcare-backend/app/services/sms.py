import logging

from app.core.config import settings

logger = logging.getLogger("healthcareplus.sms")


def _twilio_configured() -> bool:
    return bool(
        settings.TWILIO_ACCOUNT_SID
        and settings.TWILIO_AUTH_TOKEN
        and settings.TWILIO_FROM_NUMBER
    )


def send_sms(to_phone: str, message: str) -> bool:
    """Send an SMS via Twilio.

    Returns True if a message was actually sent, False if it was only
    logged (because Twilio credentials aren't configured yet) or if
    sending failed. This never raises — a booking should still succeed
    even if the SMS provider is down or not yet set up.
    """
    if not _twilio_configured():
        logger.info(
            "[SMS not sent — Twilio not configured] Would have sent to %s: %s",
            to_phone,
            message,
        )
        return False

    try:
        # Imported lazily so the twilio package is only required once
        # credentials are actually configured.
        from twilio.rest import Client

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            to=to_phone,
            from_=settings.TWILIO_FROM_NUMBER,
            body=message,
        )
        return True
    except Exception:
        logger.exception("Failed to send SMS via Twilio to %s", to_phone)
        return False


def send_booking_confirmation_sms(to_phone: str, service_name: str, date: str, time: str) -> bool:
    message = (
        f"HealthCare+: Your booking for {service_name} on {date} at {time} "
        f"has been received. Our care team will confirm shortly. For "
        f"emergencies, call 108."
    )
    return send_sms(to_phone, message)

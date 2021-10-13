from sqlalchemy.sql import func

from config.app import db


class SystemEvents(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=func.now())
    message_heading = db.Column(db.String(200), nullable=False, server_default="")
    message = db.Column(db.Text, nullable=False, server_default="")
    message_type = db.Column(db.String(100), nullable=False, server_default="")

    def pretty_print(self):
        return {
            "id": self.id,
            "message_heading": self.message_heading,
            "message": self.message,
            "message_type": self.message_type,
            "created_at": str(self.created_at),
            "updated_at": str(self.updated_at),
        }

    def save(self, commit=True):
        db.session.add(self)
        if commit:
            try:
                db.session.commit()
            except:
                db.session.rollback()

                # Exception block is just for rolling back the transaction
                # So re raise it.
                raise

    def delete(self, commit=True):
        db.session.delete(self)
        if commit:
            try:
                db.session.commit()
            except:
                db.session.rollback()

                # Exception block is just for rolling back the transaction
                # So re raise it.
                raise

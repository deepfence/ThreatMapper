from sqlalchemy.sql import func
from config.app import db
from sqlalchemy.dialects.postgresql import JSONB


class MaskedCVE(db.Model):
    
    __tablename__ = "masked_cve"

    cveid = db.Column(db.String(200), primary_key=True)
    nodes = db.Column(JSONB, nullable=False, server_default='{}', default='{}')

    def save(self, commit=True):
        db.session.add(self)
        if commit:
            try:
                db.session.commit()
            except:
                db.session.rollback()

                # Exception block is just for rolling back the transaction
                # So re raise it
                raise

    def delete(self, commit=True):
        db.session.delete(self)
        if commit:
            try:
                db.session.commit()
            except:
                db.session.rollback()

                # Exception block is just for rolling back the transaction
                # So re raise it
                raise

from sqlalchemy.sql import func
from config.extensions import db
from sqlalchemy.dialects.postgresql import JSONB


class EmailConfiguration(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email_config = db.Column(JSONB, nullable=False)
    email_provider = db.Column(db.String(100), nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=func.now())

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('email_configuration', lazy=True))
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=True)
    company = db.relationship('Company')

    encrypted_fields = ["password", "amazon_access_key", "amazon_secret_key"]

    def save(self, commit=True):
        db.session.add(self)
        if commit:
            try:
                db.session.commit()
            except:
                db.session.rollback()
                raise

    def delete(self, commit=True):
        db.session.delete(self)
        if commit:
            try:
                db.session.commit()
            except:
                db.session.rollback()
                raise

    def pretty_print(self):
        config = {k: v for k, v in self.email_config.items() if k not in self.encrypted_fields}
        return {
            "id": self.id,
            "created_at": str(self.created_at),
            "updated_at": str(self.updated_at),
            "email_provider": self.email_provider,
            "email_config": config,
        }

    def __repr__(self):
        return "<EmailConf {}>".format(self.id)

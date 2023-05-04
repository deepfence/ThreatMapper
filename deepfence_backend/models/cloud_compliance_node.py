from sqlalchemy.sql import func
from config.app import db


class CloudComplianceNode(db.Model):
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=func.now())

    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.String(200), nullable=False)
    node_name = db.Column(db.String(200), nullable=False)
    cloud_provider = db.Column(db.String(200), nullable=False)
    compliance_percentage = db.Column(db.Numeric(10, 2), nullable=False, default=0.0)
    org_account_id = db.Column(db.String(200), nullable=True)
    version = db.Column(db.String(20), nullable=True)


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

    def pretty_print(self):
        return {
            "id": self.id,
            "created_at": str(self.created_at),
            "updated_at": str(self.updated_at),
            "node_id": self.node_id,
            "node_name": self.node_name,
            "cloud_provider": self.cloud_provider,
            "compliance_percentage": self.compliance_percentage,
            "org_account_id": self.org_account_id,
            "version": self.version,
        }

    def __repr__(self):
        return "<CloudComplianceNode {}>".format(self.id)


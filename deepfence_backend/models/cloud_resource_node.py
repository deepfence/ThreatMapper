from sqlalchemy.sql import func
from sqlalchemy.schema import UniqueConstraint
from config.app import db


class CloudResourceNode(db.Model):
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=func.now())

    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.String(4096), nullable=False)
    node_type = db.Column(db.String(200), nullable=False)
    node_name = db.Column(db.String(200), nullable=False)
    cloud_provider = db.Column(db.String(200), nullable=False)
    account_id = db.Column(db.String(200), nullable=False)
    region = db.Column(db.String(200), nullable=True)
    service_name = db.Column(db.String(200), nullable=True)
    is_active = db.Column(db.Boolean, nullable=True)
    last_scanned_time = db.Column(db.DateTime(timezone=True), nullable=True)

    __table_args__ = (UniqueConstraint('node_id', 'node_type', 'region','service_name','account_id', name='node_id_constraint'),)

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
            "node_type": self.node_type,
            "node_name": self.node_name,
            "cloud_provider": self.cloud_provider,
            "region": self.region,
            "account_id": self.account_id,
            "service_name" : self.service_name,
            "is_active": self.is_active
        }

    def __repr__(self):
        return "<CloudResourceNode {}>".format(self.id)


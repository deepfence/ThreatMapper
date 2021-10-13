from sqlalchemy.sql import func
from config.app import db
from sqlalchemy.schema import UniqueConstraint


class NodeTags(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    node_name = db.Column(db.String(200), nullable=False, server_default="", default="")
    host_name = db.Column(db.String(200), nullable=False, server_default="", default="")
    node_type = db.Column(db.String(100), nullable=False, server_default="host", default="host")
    tags = db.Column(db.String(2000), nullable=False, server_default="", default="")

    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint('node_name', 'host_name', 'node_type', name='node_tags_constraint'),)

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
            "updated_at": str(self.updated_at)
        }

    def __repr__(self):
        return "<NodeTags {}".format(self.id)

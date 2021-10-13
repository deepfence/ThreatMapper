from sqlalchemy.sql import func
from config.app import db
from sqlalchemy.dialects.postgresql import JSONB
from utils.custom_exception import DFError
from sqlalchemy.exc import SQLAlchemyError


class Scheduler(db.Model):
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=func.now())

    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(200), nullable=False)  # what action to perform
    description = db.Column(db.String(1024), nullable=False)  # user defined description of node group
    cron_expr = db.Column(db.String(200), nullable=False)
    nodes = db.Column(JSONB, nullable=False)  # node details
    node_names = db.Column(db.String(1024), nullable=False)  # short list of node names for UI
    is_enabled = db.Column(db.Boolean, nullable=False, default=True)
    status = db.Column(db.String(1024), nullable=False)  # task status
    last_ran_at = db.Column(db.DateTime(timezone=True), nullable=True)

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

    @classmethod
    def bulk_update_schedules(cls, selected_schedules, is_enabled):
        try:
            update_count = selected_schedules.update(values={"is_enabled": is_enabled}, synchronize_session=False)
            db.session.commit()
            return update_count
        except SQLAlchemyError as err:
            db.session.rollback()
            raise DFError("Database error", error=err)
        except Exception as err:
            db.session.rollback()
            raise DFError("Sorry, Something went wrong", error=err)

    @classmethod
    def bulk_delete_schedules(cls, selected_schedules):
        try:
            delete_count = selected_schedules.delete(synchronize_session=False)
            db.session.commit()
            return delete_count
        except SQLAlchemyError as err:
            db.session.rollback()
            raise DFError("Database error", error=err)
        except Exception as err:
            db.session.rollback()
            raise DFError("Sorry, Something went wrong", error=err)

    def pretty_print(self):
        return {
            "id": self.id,
            "created_at": str(self.created_at),
            "updated_at": str(self.updated_at),
            "action": self.action,
            "description": self.description,
            "cron": self.cron_expr,
            "status": self.status,
            "last_ran_at": str(self.last_ran_at),
            "node_names": self.node_names,
            "is_enabled": self.is_enabled,
            "node_type": self.nodes.get("node_type", ""),
        }

    def __repr__(self):
        return "<Scheduler {}>".format(self.id)

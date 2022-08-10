from sqlalchemy.sql import func
from config.app import db
from sqlalchemy.schema import UniqueConstraint
from models.compliance_rules_disabled import ComplianceRulesDisabled
from utils.custom_exception import DFError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_, and_


class ComplianceRules(db.Model):
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=func.now())

    id = db.Column(db.Integer, primary_key=True)
    compliance_check_type = db.Column(db.String(200), nullable=False)
    test_category = db.Column(db.String(200), nullable=True)
    test_number = db.Column(db.String(200), nullable=False)
    test_desc = db.Column(db.Text, nullable=True)
    test_rationale = db.Column(db.Text, nullable=True)
    cloud_provider = db.Column(db.String(200), nullable=True)
    is_enabled = db.Column(db.Boolean, nullable=False, default=True)
    __table_args__ = (UniqueConstraint('compliance_check_type', 'test_number', 'cloud_provider', name='compliance_rules_constraint'),)

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
    def bulk_update_rules(cls, selected_rules, is_enabled):
        try:
            update_count = selected_rules.update(values={"is_enabled": is_enabled}, synchronize_session=False)
            db.session.commit()
            return update_count
        except SQLAlchemyError as err:
            db.session.rollback()
            raise DFError("Database error", error=err)
        except Exception as err:
            db.session.rollback()
            raise DFError("Sorry, Something went wrong", error=err)

    @staticmethod
    def get_rules_with_status(compliance_check_type, cloud_provider, node_id):
        rules = db.session.query(ComplianceRules, ComplianceRulesDisabled).filter_by(
            compliance_check_type=compliance_check_type, cloud_provider=cloud_provider).order_by(
            ComplianceRules.created_at.asc()).join(ComplianceRulesDisabled, and_(
                                                   ComplianceRulesDisabled.disabled_rule_id == ComplianceRules.id,
                                                   or_(ComplianceRulesDisabled.node_id == None,
                                                       ComplianceRulesDisabled.node_id == node_id)
                                                   ), isouter=True).all()
        rule_objects = []
        if rules:
            for rule in rules:
                rule[0].is_enabled = rule[1] == None
                rule_objects.append(rule[0])
        return rule_objects

    def pretty_print(self):
        return {
            "id": self.id,
            "created_at": str(self.created_at),
            "updated_at": str(self.updated_at),
            "compliance_check_type": self.compliance_check_type,
            "test_category": self.test_category,
            "test_number": self.test_number,
            "test_desc": self.test_desc,
            "test_rationale": self.test_rationale,
            "is_enabled": self.is_enabled,
        }

    def __repr__(self):
        return "<ComplianceRules {}>".format(self.id)

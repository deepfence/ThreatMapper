from sqlalchemy.sql import func
from config.app import db

class ComplianceRulesDisabled(db.Model):
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=func.now())


    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.String(200), nullable=False)
    disabled_rule_id = db.Column(db.Integer, db.ForeignKey('compliance_rules.id'), nullable=False)
    compliance_rule = db.relationship('ComplianceRules', backref=db.backref('compliance_rules_disabled', lazy=True))

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

    @staticmethod
    def bulk_insert(rules, node_id, commit=True):
        rule_objects = []
        for rule in rules:
            disabled_rule = ComplianceRulesDisabled(node_id=node_id, disabled_rule_id=rule)
            rule_objects.append(disabled_rule)
       
        if commit:
            try:
                db.session.bulk_save_objects(rule_objects)
                db.session.commit()
            except:
                db.session.rollback()

                # Exception block is just for rolling back the transaction
                # So re raise it
                raise

    @staticmethod
    def bulk_delete(rules, node_id, commit=True):
        try:
            selected_disabled_rules = ComplianceRulesDisabled.query.filter(
                ComplianceRulesDisabled.node_id == node_id,
                ComplianceRulesDisabled.disabled_rule_id.in_(rules)
            )
            delete_count = selected_disabled_rules.delete(synchronize_session=False)
            db.session.commit()
            return delete_count
        except SQLAlchemyError as err:
            db.session.rollback()
            raise DFError('Database error', error=err)
        except Exception as err:
            db.session.rollback()
            raise DFError("Sorry, Something went wrong", error=err)

    def __repr__(self):
        return '<ComplianceRulesDisabled %r>' % self.id

    
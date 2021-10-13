from config.extensions import db
from sqlalchemy.dialects.postgresql import JSONB


class Setting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.Text(), nullable=False)
    value = db.Column(JSONB, nullable=False)

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

    def __repr__(self):
        return '<Setting {}>'.format(self.id)


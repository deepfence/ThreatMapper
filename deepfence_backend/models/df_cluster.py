from flask import current_app as app

from config.extensions import db


class DFCluster(db.Model):
    """
    DF Cluster uniquely identifies a Deepfence on-prem deployment.
    Unique ID, based on MAC address will be created based on rfc4122 recommendations.
    Once created, it will be persisted in database and will not change for the entire installation
    session
    """

    id = db.Column(db.BigInteger, primary_key=True)

    def save(self, commit=True):
        db.session.add(self)
        if commit:
            try:
                db.session.commit()
            except:
                db.session.rollback()
                raise

    def __repr__(self):
        return "<DFCluster {}>".format(self.id)

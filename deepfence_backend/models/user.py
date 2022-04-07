import datetime

import arrow
from sqlalchemy.sql import func
from flask import current_app as app
from werkzeug.security import generate_password_hash, check_password_hash

from config.extensions import db
from utils.constants import USER_ROLES, INVITE_EXPIRY
from utils.custom_exception import MultipleCompaniesFound


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)

    role_id = db.Column(db.Integer, db.ForeignKey('role.id'), nullable=False)
    role = db.relationship('Role', backref=db.backref('users', lazy=True))

    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False)
    company = db.relationship('Company', backref=db.backref('users', lazy=True))

    notification = db.relationship('Notification', uselist=False, back_populates='user')
    api_key = db.Column(db.String(100), unique=True, nullable=False)

    phone_number = db.Column(db.String(100), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    password_invalidated = db.Column(db.Boolean, default=False,
                                     server_default='f', nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())
    isActive = db.Column(db.Boolean, default=True, server_default='t', nullable=False)

    def set_password(self, password):
        password_hash = generate_password_hash(password)
        self.password_hash = password_hash

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def full_name(self):
        return self.first_name + " " + self.last_name

    def get_identity(self):
        """
        Use this to generate access token.
        """
        user_identity = {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "company": self.company.name,
            "role": self.role.name,
            "api_key": self.api_key,
            "isActive": self.isActive,
            "company_license_exists": True,
        }

        return user_identity

    def save(self, commit=True):
        db.session.add(self)
        # add a notification for the user.
        notification = Notification(
            user=self
        )
        db.session.add(notification)

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
        return '<User {}>'.format(self.email)


class Role(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

    @staticmethod
    def get_all_roles():
        return Role.query.all()

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

    def __repr__(self):
        return '<Role {}>'.format(self.name)


class Company(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

    def pre_save_checks(self):
        # There should be only one company
        count = Company.query.count()
        if count == 0 and self.id is None:
            return True
        return False

    def pre_save(self):
        """
        Use this method to modify the data before storing in the database.
        """
        self.name = self.name.lower()

    def save(self, commit=True):
        if not self.pre_save_checks():
            companies = Company.query.all()
            companies = [company.name for company in companies]
            app.logger.error("Multiple companies found: [{}]".format(companies))
            raise MultipleCompaniesFound()

        self.pre_save()

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

    def get_admins(self):
        """
        Get all admins of a company.
        """
        admins = []
        for user in self.users:
            if user.isActive and user.role.name == USER_ROLES.ADMIN_USER:
                admins.append(user)
        return admins

    def __repr__(self):
        return '<Company {}>'.format(self.name)


class Invite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(255), unique=True, nullable=False)
    created_by = db.relationship('User', backref=db.backref('invites', lazy=True))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    company = db.relationship('Company', backref=db.backref('invites', lazy=True))
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False)

    role = db.relationship('Role', backref=db.backref('invites', lazy=True))
    role_id = db.Column(db.Integer, db.ForeignKey('role.id'), nullable=False)

    accepted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

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

    def is_expired(self):
        if arrow.get(self.created_at).datetime \
                + datetime.timedelta(seconds=INVITE_EXPIRY) < arrow.now().datetime:
            return True
        return False

    def __repr__(self):
        return '<Invite {}>'.format(self.id)


class PasswordReset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(255), unique=True, nullable=False)
    expiry_timedelta = db.Column(db.Integer, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

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
        return '<PasswordReset {}>'.format(self.id)


class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    last_seen = db.Column(db.DateTime(timezone=True), nullable=False, default=func.now())

    # One to one mapping with user
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    user = db.relationship('User', back_populates='notification')

    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

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

    def __repr__(self):
        return '<Notification {}>'.format(self.id)

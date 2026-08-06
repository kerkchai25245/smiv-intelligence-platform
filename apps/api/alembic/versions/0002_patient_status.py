"""Add patient operational status."""

import sqlalchemy as sa

from alembic import op

revision = "0002_patient_status"
down_revision = "0001_phase2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("patients")}
    if "status" not in columns:
        op.add_column(
            "patients",
            sa.Column("status", sa.String(length=30), nullable=False, server_default="active"),
        )
    indexes = {index["name"] for index in inspector.get_indexes("patients")}
    if "ix_patients_status" not in indexes:
        op.create_index("ix_patients_status", "patients", ["status"])


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    indexes = {index["name"] for index in inspector.get_indexes("patients")}
    if "ix_patients_status" in indexes:
        op.drop_index("ix_patients_status", table_name="patients")
    columns = {column["name"] for column in inspector.get_columns("patients")}
    if "status" in columns:
        op.drop_column("patients", "status")

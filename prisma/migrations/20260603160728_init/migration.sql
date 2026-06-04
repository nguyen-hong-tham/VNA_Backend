-- CreateEnum
CREATE TYPE "EnterpriseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BUSINESS_LICENSE', 'TAX_CERTIFICATE', 'IDENTIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('HALF_YEAR', 'YEAR');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INJURY_TYPE', 'INJURY_FACTOR', 'OCCUPATION', 'ACCIDENT_CAUSE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('ACCIDENT', 'ALLOWANCE');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "parent_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "birth_date" DATE,
    "gender" VARCHAR(20),
    "position" VARCHAR(255),
    "avatar_url" VARCHAR(500),
    "province_id" INTEGER,
    "ward_id" INTEGER,
    "address" TEXT,
    "role_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "otp" CHAR(6) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_change_otps" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "new_email" VARCHAR(255) NOT NULL,
    "otp" CHAR(6) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_change_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_types" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_fields" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "parent_id" INTEGER,
    "level" INTEGER NOT NULL DEFAULT 1,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprises" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "tax_code" VARCHAR(50) NOT NULL,
    "license_number" VARCHAR(100) NOT NULL,
    "license_issue_date" DATE,
    "name" VARCHAR(255) NOT NULL,
    "english_name" VARCHAR(255),
    "business_type_id" INTEGER NOT NULL,
    "business_field_id" INTEGER NOT NULL,
    "province_id" INTEGER,
    "ward_id" INTEGER,
    "registered_address" TEXT NOT NULL,
    "operating_address" TEXT,
    "email" VARCHAR(255),
    "office_phone" VARCHAR(20),
    "representative_name" VARCHAR(255) NOT NULL,
    "representative_phone" VARCHAR(20),
    "status" "EnterpriseStatus" NOT NULL DEFAULT 'PENDING',
    "approved_at" TIMESTAMP(3),
    "approved_by" INTEGER,
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_documents" (
    "id" SERIAL NOT NULL,
    "enterprise_id" INTEGER NOT NULL,
    "document_name" VARCHAR(255) NOT NULL,
    "document_type" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100),
    "file_size" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_periods" (
    "id" SERIAL NOT NULL,
    "report_name" VARCHAR(255) NOT NULL,
    "year" INTEGER NOT NULL,
    "period_type" "PeriodType" NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "status" "PeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "type" "CategoryType" NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "parent_id" INTEGER,
    "level" INTEGER NOT NULL DEFAULT 1,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "enterprise_id" INTEGER NOT NULL,
    "report_period_id" INTEGER NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "company_employee_total" INTEGER NOT NULL DEFAULT 0,
    "female_employee_total" INTEGER NOT NULL DEFAULT 0,
    "salary_fund" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "attached_file_name" VARCHAR(255),
    "attached_file_path" VARCHAR(500),
    "submitted_at" TIMESTAMP(3),
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_sections" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "section_type" "SectionType" NOT NULL,
    "accident_count" INTEGER NOT NULL DEFAULT 0,
    "fatal_accident_count" INTEGER NOT NULL DEFAULT 0,
    "multi_victim_accident_count" INTEGER NOT NULL DEFAULT 0,
    "victim_count" INTEGER NOT NULL DEFAULT 0,
    "unmanaged_cause_victim_count" INTEGER NOT NULL DEFAULT 0,
    "female_victim_count" INTEGER NOT NULL DEFAULT 0,
    "unmanaged_cause_female_victim_count" INTEGER NOT NULL DEFAULT 0,
    "death_count" INTEGER NOT NULL DEFAULT 0,
    "unmanaged_cause_death_count" INTEGER NOT NULL DEFAULT 0,
    "severely_injured_count" INTEGER NOT NULL DEFAULT 0,
    "unmanaged_cause_severely_injured_count" INTEGER NOT NULL DEFAULT 0,
    "medical_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "salary_compensation" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "compensation_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "asset_damage" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "days_lost" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_accident_cases" (
    "id" SERIAL NOT NULL,
    "report_section_id" INTEGER NOT NULL,
    "accident_cause_id" INTEGER,
    "injury_factor_id" INTEGER,
    "occupation_id" INTEGER,
    "accident_count" INTEGER NOT NULL DEFAULT 0,
    "fatal_accident_count" INTEGER NOT NULL DEFAULT 0,
    "multi_victim_accident_count" INTEGER NOT NULL DEFAULT 0,
    "victim_count" INTEGER NOT NULL DEFAULT 0,
    "unmanaged_cause_victim_count" INTEGER NOT NULL DEFAULT 0,
    "female_victim_count" INTEGER NOT NULL DEFAULT 0,
    "unmanaged_cause_female_victim_count" INTEGER NOT NULL DEFAULT 0,
    "death_count" INTEGER NOT NULL DEFAULT 0,
    "unmanaged_cause_death_count" INTEGER NOT NULL DEFAULT 0,
    "severely_injured_count" INTEGER NOT NULL DEFAULT 0,
    "unmanaged_cause_severely_injured_count" INTEGER NOT NULL DEFAULT 0,
    "medical_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "salary_compensation" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "compensation_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "asset_damage" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "days_lost" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_accident_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "business_types_code_key" ON "business_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "business_fields_code_key" ON "business_fields"("code");

-- CreateIndex
CREATE UNIQUE INDEX "enterprises_user_id_key" ON "enterprises"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "enterprises_tax_code_key" ON "enterprises"("tax_code");

-- CreateIndex
CREATE UNIQUE INDEX "enterprises_license_number_key" ON "enterprises"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "enterprises_email_key" ON "enterprises"("email");

-- CreateIndex
CREATE UNIQUE INDEX "report_periods_year_period_type_key" ON "report_periods"("year", "period_type");

-- CreateIndex
CREATE UNIQUE INDEX "categories_type_code_key" ON "categories"("type", "code");

-- CreateIndex
CREATE UNIQUE INDEX "reports_enterprise_id_report_period_id_key" ON "reports"("enterprise_id", "report_period_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_sections_report_id_section_type_key" ON "report_sections"("report_id", "section_type");

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "fk_permission_parent" FOREIGN KEY ("parent_id") REFERENCES "permissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_rp_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_rp_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_user_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "fk_password_reset_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_change_otps" ADD CONSTRAINT "fk_email_change_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_fields" ADD CONSTRAINT "fk_business_field_parent" FOREIGN KEY ("parent_id") REFERENCES "business_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprises" ADD CONSTRAINT "fk_enterprise_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprises" ADD CONSTRAINT "fk_enterprise_business_type" FOREIGN KEY ("business_type_id") REFERENCES "business_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprises" ADD CONSTRAINT "fk_enterprise_business_field" FOREIGN KEY ("business_field_id") REFERENCES "business_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprises" ADD CONSTRAINT "fk_enterprise_approved_by" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_documents" ADD CONSTRAINT "fk_enterprise_document" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "fk_category_parent" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "fk_report_enterprise" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "fk_report_period" FOREIGN KEY ("report_period_id") REFERENCES "report_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "fk_report_user" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_sections" ADD CONSTRAINT "fk_section_report" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_accident_cases" ADD CONSTRAINT "fk_case_section" FOREIGN KEY ("report_section_id") REFERENCES "report_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_accident_cases" ADD CONSTRAINT "fk_case_accident" FOREIGN KEY ("accident_cause_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_accident_cases" ADD CONSTRAINT "fk_case_factor" FOREIGN KEY ("injury_factor_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_accident_cases" ADD CONSTRAINT "fk_case_occupation" FOREIGN KEY ("occupation_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

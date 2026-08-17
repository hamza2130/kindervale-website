-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('Pending', 'Reviewed', 'Accepted', 'Rejected');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Admin');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'Admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "cover_image_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryImage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "gender" TEXT,
    "class_applying_for" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "admitted_in" TEXT,
    "father_name" TEXT,
    "mother_name" TEXT,
    "address" TEXT,
    "city" TEXT,
    "primary_phone" TEXT,
    "primary_email" TEXT,
    "guardian_phone" TEXT,
    "emergency_name" TEXT,
    "emergency_phone" TEXT,
    "medical_info" TEXT,
    "previous_school" TEXT,
    "documents" JSONB,
    "form_data" JSONB NOT NULL,
    "pdf_path" TEXT,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "submission_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryCategory_name_key" ON "GalleryCategory"("name");

-- CreateIndex
CREATE INDEX "GalleryImage_category_id_sort_order_idx" ON "GalleryImage"("category_id", "sort_order");

-- CreateIndex
CREATE INDEX "GalleryImage_featured_idx" ON "GalleryImage"("featured");

-- CreateIndex
CREATE INDEX "Admission_status_idx" ON "Admission"("status");

-- CreateIndex
CREATE INDEX "Admission_student_name_idx" ON "Admission"("student_name");

-- CreateIndex
CREATE INDEX "Admission_submission_date_idx" ON "Admission"("submission_date");

-- AddForeignKey
ALTER TABLE "GalleryImage" ADD CONSTRAINT "GalleryImage_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GalleryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

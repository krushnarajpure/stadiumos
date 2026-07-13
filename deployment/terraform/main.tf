terraform {
  required_version = ">= 1.3.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 4.40.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Dynamic variables declarations
variable "project_id" {
  type        = string
  description = "The Google Cloud Project ID to deploy StadiumOS resource stacks to"
  default     = "google-deepmind-stadiumos"
}

variable "region" {
  type        = string
  description = "The Google Cloud regional location to auto-provision resources"
  default     = "us-central1"
}

# Provision GKE Autopilot Cluster
resource "google_container_cluster" "stadiumos_gke" {
  name     = "stadiumos-gke-cluster"
  location = var.region

  enable_autopilot = true

  ip_allocation_policy {
    use_ip_aliases = true
  }

  release_channel {
    channel = "REGULAR"
  }
}

# Provision Cloud SQL PostgreSQL master database
resource "google_sql_database_instance" "postgres_master" {
  name             = "stadiumos-postgres-instance"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-f1-micro"
    backup_configuration {
      enabled = true
      point_in_time_recovery_enabled = true
    }
    ip_configuration {
      ipv4_enabled    = true
      private_network = null
    }
  }
  deletion_protection = false
}

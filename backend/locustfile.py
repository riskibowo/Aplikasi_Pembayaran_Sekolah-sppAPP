import random
from locust import HttpUser, task, between

class SchoolAppUser(HttpUser):
    # Waktu tunggu antar request (simulasi user sungguhan)
    # Gunakan 0.1 - 0.5 jika ingin mensimulasikan trafik padat (intensif)
    wait_time = between(1, 3)

    @task(1)
    def visit_root(self):
        self.client.get("/")

    @task(3)
    def attempt_login_fail(self):
        """
        Simulasi percobaan login gagal secara berulang
        Ini akan memicu fitur 'is_suspicious' dan 'Auto-Ban'
        """
        self.client.post("/api/auth/login", json={
            "username": f"user_test_{random.randint(1, 100)}",
            "password": "wrongpassword123"
        })

    @task(2)
    def get_public_profile(self):
        self.client.get("/api/school-profile")

    def on_start(self):
        """Dipanggil saat user mulai aktif"""
        pass

<template>
  <ion-app>
    <ion-header>
      <ion-toolbar class="main-toolbar">
        <ion-title>
          <div class="nav-brand">
            <img
              src="/hairvana-logo.png"
              alt="Hairvana"
              class="nav-logo"
            />
            <span>HAIRVANA</span>
          </div>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import {
  IonApp,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonRouterOutlet
} from '@ionic/vue';
</script>

<style scoped>
.main-toolbar {
  --background: #ffffff;
  --color: #332d2c;
  --border-color: #eee8e4;
  --min-height: 65px;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #332d2c;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 2px;
}

.nav-logo {
  width: 42px;
  height: 42px;
  object-fit: contain;
}
</style>
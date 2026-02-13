module.exports = {
  apps: [
    {
      name: "Search",
      // En Next.js, ejecutamos el comando de npm o el binario directamente
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: "max",       // Aprovecha todos los núcleos
      exec_mode: "cluster",   // Recomendado para Next.js en producción
      watch: false,           // Importante: false en Next.js
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 8080
      }
    }
  ]
}
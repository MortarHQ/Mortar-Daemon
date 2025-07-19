import express from "express";
import os from "os";
import log from "@utils/logger";

function initRouter() {
  const router = express.Router();

  router.get("/", (req, res, next) => {
    const memoryUsage = process.memoryUsage();
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    const idlePercentage = (totalIdle / totalTick) * 100;
    const usagePercentage = 100 - idlePercentage;

    res.json({
      memory: {
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`, // Resident Set Size
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`, // Total size of the V8 heap
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`, // Actual memory used by the V8 heap
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`, // Memory used by C++ objects bound to JavaScript objects
      },
      cpu: {
        usage: `${usagePercentage.toFixed(2)}%`,
        cores: cpus.length,
      },
      uptime: `${os.uptime()} seconds`,
    });
  });

  return router;
}

export default initRouter;


import Fastify from "fastify";
import githubRoutes from "./routes/github.routes";

const server = Fastify({ logger: true });

server.register(githubRoutes, { prefix: "/api/github" });

const PORT = Number(process.env.APP_PORT) || 3000;
server.listen({ port: Number(PORT) }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  server.log.info(`Server running at ${address}`);
});

export default server;

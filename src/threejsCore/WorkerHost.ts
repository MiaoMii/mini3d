import { Engine } from "./Engine";
import type { CoreConfig } from "./config";
import type {
  ResizeInfo,
  WorkerClientMessage,
  WorkerHostMessage,
} from "./types";

export type WorkerEngineFactory<TAppConfig = unknown> = (
  config: CoreConfig<TAppConfig>,
  message: Extract<WorkerClientMessage, { type: "init" }>,
) => Engine | Promise<Engine>;

export function setupThreejsCoreWorker<TAppConfig = unknown>(
  createEngine: WorkerEngineFactory<TAppConfig>,
): void {
  let engine: Engine | null = null;

  self.addEventListener("message", (event: MessageEvent<WorkerClientMessage>) => {
    const message = event.data;

    void (async () => {
      try {
        if (message.type === "init") {
          engine = await createEngine(
            {
              canvas: message.canvas,
              resize: {
                initialSize: message.size,
                observe: false,
                pixelRatio: message.size.pixelRatio,
              },
              app: message.app as TAppConfig,
            },
            message,
          );
          engine.refreshSize();
          postHostMessage({ type: "ready" });
          return;
        }

        if (!engine) {
          throw new Error("Worker engine has not been initialized.");
        }

        if (message.type === "resize") {
          applySize(engine, message.size);
          return;
        }

        if (message.type === "start") {
          await engine.start();
          postHostMessage({ type: "started" });
          return;
        }

        if (message.type === "stop") {
          await engine.stop();
          postHostMessage({ type: "stopped" });
          return;
        }

        if (message.type === "invalidate") {
          engine.invalidate();
          return;
        }

        if (message.type === "destroy") {
          await engine.destroy();
          engine = null;
          postHostMessage({ type: "destroyed" });
        }
      } catch (error) {
        postHostMessage(serializeError(error));
      }
    })();
  });
}

function applySize(engine: Engine, size: ResizeInfo): void {
  engine.resize.setSize(size);
}

function postHostMessage(message: WorkerHostMessage): void {
  self.postMessage(message);
}

function serializeError(error: unknown): WorkerHostMessage {
  if (error instanceof Error) {
    return {
      type: "error",
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    type: "error",
    message: String(error),
  };
}

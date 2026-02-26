import amqplib from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://friday:friday@localhost:5672";

// Queue names
export const QUEUES = {
    JIRA_SYNC: "friday.pm.jira.sync",
    GITHUB_SYNC: "friday.pm.github.sync",
    RISK_DETECTION: "friday.pm.ai.risk-detection",
    NOTIFICATIONS: "friday.pm.notifications",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

class QueueService {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private connection: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private channel: any = null;

    async connect(): Promise<void> {
        try {
            this.connection = await amqplib.connect(RABBITMQ_URL);
            this.channel = await this.connection.createChannel();

            // Assert all queues with durable persistence
            for (const q of Object.values(QUEUES)) {
                await this.channel.assertQueue(q, { durable: true });
            }

            console.log("[QueueService] Connected to RabbitMQ");

            this.connection.on("error", (err: Error) => {
                console.error("[QueueService] Connection error:", err.message);
            });
        } catch (err) {
            console.error("[QueueService] Failed to connect:", err);
            // Retry after 5s in production
            setTimeout(() => this.connect(), 5000);
        }
    }

    async publish<T>(queue: QueueName, payload: T): Promise<void> {
        if (!this.channel) throw new Error("QueueService not connected");
        const msg = Buffer.from(JSON.stringify(payload));
        this.channel.sendToQueue(queue, msg, { persistent: true });
    }

    async subscribe<T>(
        queue: QueueName,
        handler: (payload: T) => Promise<void>
    ): Promise<void> {
        if (!this.channel) throw new Error("QueueService not connected");
        await this.channel.consume(queue, async (msg: { content: Buffer } | null) => {
            if (!msg) return;
            try {
                const payload = JSON.parse(msg.content.toString()) as T;
                await handler(payload);
                this.channel!.ack(msg);
            } catch (err) {
                console.error(`[QueueService] Handler error on ${queue}:`, err);
                this.channel!.nack(msg, false, false); // dead-letter if fails
            }
        });
    }

    async close(): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.channel as any)?.close();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.connection as any)?.close();
    }
}

// Singleton
export const queueService = new QueueService();

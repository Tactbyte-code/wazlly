import { db } from '../server/db';
import { channels } from '@shared/schema';

async function insertTestChannel() {
  try {
    const newChannel = await db.insert(channels).values({
      name: "Test WhatsApp Channel",
      phoneNumberId: "123456789012345",
      accessToken: "EAABbbCCddEEffGGhhIIjjKKllMMnnOOppQQrrSSttUUvvWWxxYYzz",
      whatsappBusinessAccountId: "987654321098765",
      phoneNumber: "+1234567890",
      appId: "11223344556677",
      isActive: true,
      healthStatus: "healthy",
      connectionMethod: "embedded",
      createdBy: "system_test"
    }).returning();

    console.log("Successfully inserted test channel:", JSON.stringify(newChannel[0], null, 2));
    process.exit(0);
  } catch (error) {
    console.error("Error inserting test channel:", error);
    process.exit(1);
  }
}

insertTestChannel();

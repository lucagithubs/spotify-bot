const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

console.log(`📂 Loading ${commandFiles.length} command(s)...`);
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
  console.log(`✅ Loaded command: /${command.data.name}`);
}

client.once('ready', () => {
  console.log(`🤖 Bot is online as ${client.user.tag}`);
  console.log(`⚡ Ready to serve ${client.guilds.cache.size} guild(s)`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    console.log(`📝 Executing command: /${interaction.commandName} in guild ${interaction.guildId}`);
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error executing command: ${error.message}`);
    const msg = { content: '❌ Something went wrong!', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg);
    } else {
      await interaction.reply(msg);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

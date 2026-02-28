const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🧹 Clearing old guild commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_APPLICATION_ID, '1474450202671710450'),
      { body: [] }
    );

    console.log('🧹 Clearing old global commands...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID),
      { body: [] }
    );

    console.log('🚀 Registering commands globally...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID),
      { body: commands }
    );

    console.log('✅ Commands registered!');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
})();
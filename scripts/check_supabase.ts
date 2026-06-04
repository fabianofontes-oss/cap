import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Preferentially the service_role key to read schema

async function run() {
  if (!supabaseUrl || !supabaseKey) {
    console.error("ERROR: Variables SUPABASE_URL or SUPABASE_KEY are missing.");
    console.log("Please add them to the AI Studio 'Settings' / 'Secrets' menu and restart the chat turn.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log("Supabase client initialized. Testing connection...");

  // Supabase postgREST does not expose information_schema by default.
  // We will try an RPC call, or just fetch from an assumed table like 'questions', 'perguntas', 'cap_questions'.
  const possibleTables = ['perguntas', 'questions', 'cap_questions', 'flashcards', 'quizzes'];
  
  let found = false;
  for (const table of possibleTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`\n✅ SUCCESS: Found table '${table}'!`);
      if (data && data.length > 0) {
        console.log(`Structure of '${table}':`);
        console.log(Object.keys(data[0]).join(', '));
        console.log("Sample Data:");
        console.log(JSON.stringify(data[0], null, 2));
      } else {
        console.log(`Table '${table}' is empty.`);
      }
      found = true;
    }
  }

  if (!found) {
    console.log("\n❌ Could not find standard table names (perguntas, questions, etc) or no read permissions.");
    console.log("If your table has a specific name, please let us know!");
  }
}

run().catch(console.error);

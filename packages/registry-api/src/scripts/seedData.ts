import { supabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const samplePackages = [
  {
    name: 'supabase-mcp-server',
    version: '1.0.0',
    description: 'Connect your Supabase projects to AI assistants. Manage tables, fetch configs, and query data seamlessly.',
    source_api_url: 'https://github.com/supabase/mcp-server',
    tags: ['database', 'ai', 'integration', 'supabase'],
    downloads_count: 1240,
    tools: [
      {
        tool_name: 'query_database',
        description: 'Execute SQL queries on Supabase database',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'SQL query to execute' },
            table: { type: 'string', description: 'Target table name' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            results: { type: 'array', description: 'Query results' },
            rowCount: { type: 'number', description: 'Number of rows returned' }
          }
        }
      },
      {
        tool_name: 'list_tables',
        description: 'List all tables in the database',
        input_schema: {},
        output_schema: {
          type: 'object',
          properties: {
            tables: { type: 'array', description: 'List of table names' }
          }
        }
      },
      {
        tool_name: 'get_table_schema',
        description: 'Get the schema for a specific table',
        input_schema: {
          type: 'object',
          properties: {
            table_name: { type: 'string', description: 'Name of the table' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            columns: { type: 'array', description: 'Table column definitions' }
          }
        }
      }
    ]
  },
  {
    name: 'openai-connector',
    version: '2.1.0',
    description: 'Seamless integration with OpenAI\'s API for chat completions and embeddings',
    source_api_url: 'https://github.com/openai/mcp-connector',
    tags: ['apis', 'ai', 'openai', 'chat'],
    downloads_count: 8900,
    tools: [
      {
        tool_name: 'chat_completion',
        description: 'Generate chat completions using OpenAI API',
        input_schema: {
          type: 'object',
          properties: {
            messages: { type: 'array', description: 'Array of message objects' },
            model: { type: 'string', description: 'Model to use (e.g., gpt-4)' },
            temperature: { type: 'number', description: 'Sampling temperature' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Generated response' },
            usage: { type: 'object', description: 'Token usage information' }
          }
        }
      },
      {
        tool_name: 'create_embeddings',
        description: 'Create embeddings for text using OpenAI',
        input_schema: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Text to embed' },
            model: { type: 'string', description: 'Embedding model to use' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            embeddings: { type: 'array', description: 'Generated embeddings' }
          }
        }
      },
      {
        tool_name: 'moderate_content',
        description: 'Check content against OpenAI\'s moderation API',
        input_schema: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Content to moderate' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            flagged: { type: 'boolean', description: 'Whether content was flagged' },
            categories: { type: 'object', description: 'Moderation categories' }
          }
        }
      }
    ]
  },
  {
    name: 'web-scraper-framework',
    version: '1.5.2',
    description: 'Robust web scraping framework with rate limiting and proxy support',
    tags: ['frameworks', 'web', 'automation', 'data'],
    downloads_count: 15200,
    tools: [
      {
        tool_name: 'scrape_url',
        description: 'Scrape content from a URL',
        input_schema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to scrape' },
            selectors: { type: 'object', description: 'CSS selectors for extraction' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Scraped content' },
            metadata: { type: 'object', description: 'Page metadata' }
          }
        }
      },
      {
        tool_name: 'batch_scrape',
        description: 'Scrape multiple URLs with rate limiting',
        input_schema: {
          type: 'object',
          properties: {
            urls: { type: 'array', description: 'Array of URLs to scrape' },
            delay: { type: 'number', description: 'Delay between requests in ms' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            results: { type: 'array', description: 'Array of scraping results' }
          }
        }
      }
    ]
  },
  {
    name: 'slack-integration',
    version: '1.2.0',
    description: 'Connect your agents to Slack workspaces for team collaboration',
    source_api_url: 'https://github.com/slack/mcp-integration',
    tags: ['connectors', 'slack', 'integration', 'collaboration'],
    downloads_count: 9800,
    tools: [
      {
        tool_name: 'send_message',
        description: 'Send a message to a Slack channel',
        input_schema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel ID or name' },
            message: { type: 'string', description: 'Message content' },
            attachments: { type: 'array', description: 'Message attachments' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', description: 'Whether message was sent' },
            timestamp: { type: 'string', description: 'Message timestamp' }
          }
        }
      },
      {
        tool_name: 'list_channels',
        description: 'List available Slack channels',
        input_schema: {},
        output_schema: {
          type: 'object',
          properties: {
            channels: { type: 'array', description: 'List of channel objects' }
          }
        }
      },
      {
        tool_name: 'get_user_info',
        description: 'Get information about a Slack user',
        input_schema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Slack user ID' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            user: { type: 'object', description: 'User information' }
          }
        }
      },
      {
        tool_name: 'create_thread',
        description: 'Create a thread in a Slack channel',
        input_schema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel ID' },
            parent_message: { type: 'string', description: 'Parent message timestamp' },
            reply: { type: 'string', description: 'Thread reply content' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', description: 'Whether thread was created' },
            thread_ts: { type: 'string', description: 'Thread timestamp' }
          }
        }
      }
    ]
  },
  {
    name: 'email-automation',
    version: '1.0.5',
    description: 'Automated email campaigns and customer communication system',
    tags: ['tools', 'email', 'automation', 'marketing'],
    downloads_count: 6700,
    tools: [
      {
        tool_name: 'send_email',
        description: 'Send an email to one or more recipients',
        input_schema: {
          type: 'object',
          properties: {
            to: { type: 'array', description: 'Recipient email addresses' },
            subject: { type: 'string', description: 'Email subject' },
            body: { type: 'string', description: 'Email body content' },
            template: { type: 'string', description: 'Template name to use' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            messageId: { type: 'string', description: 'Email message ID' },
            sent: { type: 'boolean', description: 'Whether email was sent' }
          }
        }
      },
      {
        tool_name: 'create_campaign',
        description: 'Create and schedule an email campaign',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Campaign name' },
            recipients: { type: 'array', description: 'List of recipient emails' },
            template: { type: 'string', description: 'Email template' },
            schedule: { type: 'string', description: 'Schedule time' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', description: 'Campaign ID' },
            status: { type: 'string', description: 'Campaign status' }
          }
        }
      }
    ]
  },
  {
    name: 'ecommerce-template',
    version: '1.1.0',
    description: 'Complete e-commerce agent template with inventory and order management',
    tags: ['templates', 'ecommerce', 'inventory', 'orders'],
    downloads_count: 4300,
    tools: [
      {
        tool_name: 'get_products',
        description: 'Retrieve product information from inventory',
        input_schema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Product category filter' },
            limit: { type: 'number', description: 'Maximum number of products' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            products: { type: 'array', description: 'List of products' },
            total: { type: 'number', description: 'Total product count' }
          }
        }
      },
      {
        tool_name: 'process_order',
        description: 'Process a new customer order',
        input_schema: {
          type: 'object',
          properties: {
            items: { type: 'array', description: 'Order items' },
            customer: { type: 'object', description: 'Customer information' },
            payment: { type: 'object', description: 'Payment details' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: 'Generated order ID' },
            status: { type: 'string', description: 'Order status' },
            total: { type: 'number', description: 'Order total' }
          }
        }
      }
    ]
  }
];

export async function seedDatabase() {
  console.log('🌱 Seeding database with sample MCP packages...');

  for (const pkg of samplePackages) {
    try {
      const packageId = uuidv4();
      
      // Insert the main package
      const { error: packageError } = await supabase
        .from('mcp_packages')
        .insert({
          id: packageId,
          name: pkg.name,
          version: pkg.version,
          description: pkg.description,
          source_api_url: pkg.source_api_url,
          tags: pkg.tags,
          downloads_count: pkg.downloads_count
        })
        .select()
        .single();

      if (packageError) {
        console.error(`Failed to create package ${pkg.name}:`, packageError.message);
        continue;
      }

      console.log(`✅ Created package: ${pkg.name}`);

      // Insert tools if provided
      if (pkg.tools && pkg.tools.length > 0) {
        const toolsData = pkg.tools.map(tool => ({
          id: uuidv4(),
          package_id: packageId,
          tool_name: tool.tool_name,
          description: tool.description,
          input_schema: tool.input_schema,
          output_schema: tool.output_schema
        }));

        const { error: toolsError } = await supabase
          .from('mcp_tools')
          .insert(toolsData);

        if (toolsError) {
          console.error(`Failed to create tools for ${pkg.name}:`, toolsError.message);
        } else {
          console.log(`✅ Created ${pkg.tools.length} tools for ${pkg.name}`);
        }
      }

      // Create a sample deployment
      const { error: deploymentError } = await supabase
        .from('mcp_deployments')
        .insert({
          id: uuidv4(),
          package_id: packageId,
          deployment_url: `https://${pkg.name.replace('-', '-')}-demo.railway.app`,
          status: 'active',
          health_check_url: `https://${pkg.name.replace('-', '-')}-demo.railway.app/health`
        });

      if (deploymentError) {
        console.error(`Failed to create deployment for ${pkg.name}:`, deploymentError.message);
      } else {
        console.log(`✅ Created deployment for ${pkg.name}`);
      }

    } catch (error) {
      console.error(`Error seeding package ${pkg.name}:`, error);
    }
  }

  console.log('🎉 Database seeding completed!');
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
} 
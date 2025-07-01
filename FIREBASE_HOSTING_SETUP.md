# Firebase Hosting Setup for Sigyl MCP Platform

## Why Firebase Hosting Over Load Balancer?

### Cost Comparison
| Solution | Monthly Cost | Annual Cost |
|----------|-------------|-------------|
| **Load Balancer** | $20/month | $240/year |
| **Firebase Hosting** | FREE - $25/month | $0 - $300/year |
| **Savings** | Up to $20/month | Up to $240/year |

### Firebase Hosting Benefits
- ✅ **FREE tier**: 10 GB storage, 360 MB/day transfer
- ✅ **Custom domains included** (no extra cost)
- ✅ **Automatic SSL certificates**
- ✅ **Global CDN** (faster than load balancer)
- ✅ **Path-based routing** to different Cloud Run services
- ✅ **Static + dynamic content** hosting
- ✅ **Easy setup** (30 minutes vs 2+ hours for load balancer)

## Implementation Plan

### Step 1: Install Firebase CLI

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login
```

### Step 2: Initialize Firebase Project

```bash
# In your project root
firebase init hosting

# Select:
# - Use existing project or create new one
# - Set public directory: "public" (we'll create this)
# - Configure as single-page app: No
# - Set up automatic builds: No (for now)
```

### Step 3: Create Firebase Configuration

Create `firebase.json` in your project root:

```json
{
  "hosting": {
    "site": "sigyl-mcp",
    "public": "public",
    "rewrites": [
      {
        "source": "/weather-mcp/**",
        "run": {
          "serviceId": "weather-mcp-service",
          "region": "us-central1"
        }
      },
      {
        "source": "/database-mcp/**",
        "run": {
          "serviceId": "database-mcp-service", 
          "region": "us-central1"
        }
      },
      {
        "source": "/api/**",
        "run": {
          "serviceId": "api-mcp-service",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### Step 4: Create Landing Page

Create `public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sigyl MCP Services</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        .logo {
            font-size: 3rem;
            font-weight: bold;
            margin-bottom: 1rem;
        }
        .subtitle {
            font-size: 1.2rem;
            margin-bottom: 3rem;
            opacity: 0.9;
        }
        .services {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }
        .service {
            background: rgba(255, 255, 255, 0.1);
            padding: 2rem;
            border-radius: 12px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .service h3 {
            margin-top: 0;
            color: #fff;
        }
        .service p {
            opacity: 0.8;
            line-height: 1.6;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 1rem;
            transition: all 0.3s ease;
        }
        .btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🔮 Sigyl MCP</div>
        <div class="subtitle">Model Context Protocol Services</div>
        
        <div class="services">
            <div class="service">
                <h3>🌤️ Weather MCP</h3>
                <p>Real-time weather data and forecasting services for AI applications.</p>
                <a href="/weather-mcp/" class="btn">Access Service</a>
            </div>
            
            <div class="service">
                <h3>🗄️ Database MCP</h3>
                <p>Secure database operations and query services for AI models.</p>
                <a href="/database-mcp/" class="btn">Access Service</a>
            </div>
            
            <div class="service">
                <h3>🔧 API MCP</h3>
                <p>General-purpose API integration and automation tools.</p>
                <a href="/api/" class="btn">Access Service</a>
            </div>
        </div>
        
        <div style="margin-top: 4rem; opacity: 0.7;">
            <p>Powered by Google Cloud Run & Firebase Hosting</p>
        </div>
    </div>
</body>
</html>
```

### Step 5: Deploy to Firebase

```bash
# Deploy to Firebase
firebase deploy --only hosting

# Output will show:
# ✔ Deploy complete!
# Project Console: https://console.firebase.google.com/project/your-project
# Hosting URL: https://your-project.web.app
```

### Step 6: Add Custom Domain

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Navigate to Hosting** → Your site
3. **Click "Add custom domain"**
4. **Enter your domain**: `mcp.sigyl.dev`
5. **Follow verification steps**
6. **Add DNS records** to your domain registrar

### Step 7: DNS Configuration

Add these records to your domain registrar (Cloudflare, etc.):

```
Type: A
Name: mcp
Value: 151.101.1.195
TTL: Auto

Type: A  
Name: mcp
Value: 151.101.65.195
TTL: Auto

Type: AAAA
Name: mcp
Value: 2a04:4e42::645
TTL: Auto

Type: AAAA
Name: mcp  
Value: 2a04:4e42:200::645
TTL: Auto
```

## Dynamic Service Registration

### Update Your Deployment Service

Modify `packages/registry-api/src/services/deployer.ts`:

```typescript
// Add this function to automatically update Firebase hosting
export async function updateFirebaseHosting(serviceName: string, packageName: string) {
  const firebaseConfig = {
    hosting: {
      site: "sigyl-mcp",
      public: "public",
      rewrites: [
        // Add new service route
        {
          source: `/${packageName}/**`,
          run: {
            serviceId: serviceName,
            region: "us-central1"
          }
        },
        // ... existing routes
      ]
    }
  };
  
  // Write updated firebase.json
  await fs.writeFile('firebase.json', JSON.stringify(firebaseConfig, null, 2));
  
  // Deploy updated configuration
  await exec('firebase deploy --only hosting');
  
  return `https://mcp.sigyl.dev/${packageName}/`;
}
```

### Integration with Deployment Flow

```typescript
// In your deployRepo function
export async function deployRepo(request: DeploymentRequest): Promise<DeploymentResult> {
  // ... existing deployment logic
  
  // After successful Cloud Run deployment
  if (deploymentResult.success) {
    // Update Firebase hosting configuration
    const customUrl = await updateFirebaseHosting(serviceName, packageName);
    
    return {
      ...deploymentResult,
      deploymentUrl: customUrl, // Use custom domain instead of .run.app
      customDomain: true
    };
  }
}
```

## Advanced Configuration

### Environment-Based Routing

```json
{
  "hosting": {
    "site": "sigyl-mcp",
    "public": "public",
    "rewrites": [
      {
        "source": "/staging/**",
        "run": {
          "serviceId": "staging-mcp-service",
          "region": "us-central1"
        }
      },
      {
        "source": "/prod/**", 
        "run": {
          "serviceId": "prod-mcp-service",
          "region": "us-central1"
        }
      }
    ]
  }
}
```

### Multiple Domains

```bash
# Add additional domains
firebase hosting:sites:create sigyl-api
firebase hosting:sites:create sigyl-docs

# Configure in firebase.json
{
  "hosting": [
    {
      "site": "sigyl-mcp",
      "public": "public",
      "rewrites": [...]
    },
    {
      "site": "sigyl-api", 
      "public": "api-docs",
      "rewrites": [...]
    }
  ]
}
```

## Cost Optimization

### Free Tier Limits
- **Storage**: 10 GB
- **Transfer**: 360 MB/day (≈ 10.8 GB/month)
- **Build time**: 120 build minutes/day

### Monitoring Usage

```bash
# Check current usage
firebase hosting:metrics

# Set up billing alerts in Firebase Console
# Go to Project Settings → Usage and Billing
```

### Upgrade Triggers
Upgrade to paid plan ($25/month) when you exceed:
- 10 GB storage
- 10.8 GB monthly transfer
- Need more build minutes

## Benefits Over Load Balancer

### Cost Savings
- **Year 1**: Save $240 (if staying on free tier)
- **Year 2+**: Save $180/year (if on paid plan)

### Performance Benefits
- **Global CDN**: Faster than single load balancer
- **Edge caching**: Static assets cached globally
- **HTTP/2**: Better performance than load balancer

### Operational Benefits
- **Zero maintenance**: Firebase handles everything
- **Automatic SSL**: No certificate management
- **Easy scaling**: Automatic traffic handling
- **Simple deployment**: Single command deployment

## Migration Path

### Phase 1: Set up Firebase Hosting
1. Configure Firebase project
2. Create basic landing page
3. Add custom domain
4. Test with one MCP service

### Phase 2: Integrate with deployment service
1. Update deployer.ts to use Firebase
2. Automate firebase.json updates
3. Test end-to-end deployment

### Phase 3: Full migration
1. Migrate all existing services
2. Update frontend to use new URLs
3. Monitor performance and costs

## Conclusion

Firebase Hosting gives you:
- ✅ **90% cost savings** vs load balancer
- ✅ **Better performance** with global CDN
- ✅ **Easier management** with automatic SSL
- ✅ **Clean URLs** like `mcp.sigyl.dev/package-name`
- ✅ **Production-ready** (used by millions of sites)

**Recommendation**: Start with Firebase Hosting free tier. You can always upgrade to load balancer later if you need advanced features like Cloud Armor or complex routing rules. 
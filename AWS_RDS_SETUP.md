# AWS RDS PostgreSQL Setup Guide

## Quick Setup for AWS RDS

### 1. Create RDS Instance via AWS CLI

```bash
# Create a PostgreSQL RDS instance
aws rds create-db-instance \
  --db-instance-identifier aok-shop-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids YOUR_SECURITY_GROUP_ID \
  --backup-retention-period 7 \
  --publicly-accessible \
  --storage-type gp3 \
  --storage-encrypted

# Wait for the instance to be available
aws rds wait db-instance-available \
  --db-instance-identifier aok-shop-db

# Get the endpoint
aws rds describe-db-instances \
  --db-instance-identifier aok-shop-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

### 2. Configure Security Group

Make sure your security group allows PostgreSQL connections (port 5432) from your IP address:

```bash
# Get your current IP
curl -s https://api.ipify.org

# Add ingress rule to security group
aws ec2 authorize-security-group-ingress \
  --group-id YOUR_SECURITY_GROUP_ID \
  --protocol tcp \
  --port 5432 \
  --cidr YOUR_IP/32
```

### 3. Create Database

Connect to your RDS instance and create the database:

```bash
# Connect using psql
psql -h YOUR_RDS_ENDPOINT.amazonaws.com -U postgres -d postgres

# In psql, create the database
CREATE DATABASE aok_shop;
\q
```

### 4. Set Environment Variables

Add to your `.env.local` file:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_RDS_ENDPOINT.amazonaws.com:5432/aok_shop

# Optional: Use AWS Secrets Manager for production
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### 5. Run Database Setup

```bash
# Run the setup script to create tables and import data
npm run setup-db

# Or manually:
npx ts-node scripts/setup-database.ts
```

## Alternative: Local PostgreSQL for Development

If you want to test locally first:

### macOS
```bash
# Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb aok_shop

# Set in .env.local
DATABASE_URL=postgresql://localhost:5432/aok_shop
```

### Docker
```bash
# Run PostgreSQL in Docker
docker run --name aok-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=aok_shop \
  -p 5432:5432 \
  -d postgres:15

# Set in .env.local
DATABASE_URL=postgresql://postgres:password@localhost:5432/aok_shop
```

## Verify Setup

Test your connection:

```bash
# Test connection
node -e "
const { Client } = require('pg');
const client = new Client(process.env.DATABASE_URL);
client.connect()
  .then(() => console.log('✅ Connected to database'))
  .catch(err => console.error('❌ Connection failed:', err))
  .finally(() => client.end());
"
```

## Production Considerations

1. **Enable SSL**: Add `?sslmode=require` to your DATABASE_URL
2. **Use IAM Authentication**: For better security with AWS RDS
3. **Enable automated backups**: Already configured in the CLI command above
4. **Set up read replicas**: For scaling read operations
5. **Use connection pooling**: Already implemented in our database module
6. **Monitor with CloudWatch**: Set up alarms for CPU, storage, connections

## Troubleshooting

### Connection Refused
- Check security group rules
- Ensure RDS instance is publicly accessible (for development)
- Verify the endpoint URL is correct

### Authentication Failed
- Check username and password
- Ensure the database exists
- Try connecting with psql first to verify credentials

### Slow Queries
- Add indexes (already included in our schema)
- Check RDS instance size
- Enable Performance Insights in RDS console
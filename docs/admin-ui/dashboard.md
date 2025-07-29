# Dashboard Overview

The Dashboard is the central hub of the SMART on FHIR Admin UI, providing a comprehensive overview of your healthcare platform's status, metrics, and quick access to all management functions.

## 🏠 Dashboard Layout

### System Health Monitoring
The dashboard displays real-time system health indicators:

- **🟢 Active Components**: Shows which services are running (OAuth Server, FHIR Proxy, WebSocket)
- **📊 Performance Metrics**: Response times, memory usage, and throughput statistics
- **⚠️ Alerts**: System warnings, errors, and maintenance notifications
- **🔄 Last Update**: Real-time refresh indicators for live data

### Quick Actions Panel
Direct access to common administrative tasks:

- **➕ Add User**: Quickly register new healthcare users
- **📱 Register App**: Fast SMART application registration
- **🏥 Add FHIR Server**: Connect new FHIR endpoints
- **🎯 Configure Scopes**: Set up permission templates
- **🚀 Launch Context**: Create clinical contexts
- **👁️ Monitor OAuth**: View real-time authorization flows

### Statistics Overview
Key platform metrics at a glance:

#### User Statistics
- **Total Users**: Count of registered healthcare users
- **Active Sessions**: Currently authenticated users
- **Recent Logins**: Login activity in the last 24 hours
- **FHIR Associations**: Users with Person resource links

#### Application Statistics
- **Registered Apps**: Total SMART applications
- **Active Apps**: Applications with recent activity
- **Authorization Requests**: OAuth flows in progress
- **Successful Launches**: Completed app launches

#### FHIR Server Statistics
- **Connected Servers**: Total configured FHIR endpoints
- **Healthy Servers**: Servers responding normally
- **Response Time**: Average server response latency
- **Data Volume**: Recent FHIR operations

#### OAuth Analytics
- **Authorization Flows**: Total OAuth requests
- **Success Rate**: Percentage of successful authorizations
- **Error Rate**: Failed authorization attempts
- **Flow Types**: Breakdown by authorization grant type

## 🔍 Real-time Monitoring

### Live Updates
The dashboard automatically refreshes every 30 seconds to provide:
- Current system status
- Updated metrics and counters
- New alerts and notifications
- Fresh performance data

### WebSocket Integration
Real-time updates via WebSocket connections:
- OAuth flow notifications
- System health changes
- User activity alerts
- FHIR server status updates

## 📊 Visual Components

### Health Status Indicators
- **🟢 Green**: System operating normally
- **🟡 Yellow**: Minor issues or warnings
- **🔴 Red**: Critical issues requiring attention
- **⚪ Gray**: Service unavailable or disabled

### Metric Cards
Each metric is displayed in an interactive card showing:
- Current value with trend indicators
- Percentage change from previous period
- Historical trend visualization
- Quick action buttons for related tasks

### Activity Timeline
Recent platform activity including:
- User registrations and logins
- Application launches
- System events and changes
- Error occurrences and resolutions

## 🛠️ Dashboard Actions

### System Management
- **Refresh Data**: Manual system refresh
- **View Logs**: Access to system and audit logs
- **Export Reports**: Generate platform usage reports
- **System Settings**: Access to global configuration

### Quick Navigation
The dashboard provides one-click access to:
- User management section
- SMART app registry
- FHIR server configuration
- Scope management tools
- Launch context builder
- OAuth monitoring dashboard
- Identity provider settings

## 📱 Mobile Responsiveness

The dashboard is fully responsive and optimized for:
- **Desktop**: Full-featured experience with all metrics
- **Tablet**: Optimized layout with key information
- **Mobile**: Essential metrics and quick actions

## 🔔 Notifications and Alerts

### System Notifications
- Service status changes
- Performance threshold alerts
- Security warnings
- Maintenance reminders

### User Notifications
- New user registrations
- Failed login attempts
- Permission changes
- Account status updates

### Application Notifications
- New app registrations
- Authorization failures
- Scope violations
- Launch context errors

## 🎨 Customization

### Dashboard Widgets
Customize your dashboard view by:
- Rearranging metric cards
- Hiding/showing specific statistics
- Setting custom refresh intervals
- Configuring alert thresholds

### Theme Options
- Light mode for daytime use
- Dark mode for extended sessions
- System-based automatic switching
- High contrast accessibility mode

## 📈 Performance Insights

### Trending Data
The dashboard shows trends for:
- User growth over time
- Application usage patterns
- OAuth success rates
- FHIR server performance
- System resource utilization

### Comparative Analytics
- Month-over-month growth
- Peak usage periods
- Error pattern analysis
- Performance bottleneck identification

## 🔧 Troubleshooting

### Common Dashboard Issues

**Dashboard not loading:**
- Check internet connection
- Verify authentication status
- Clear browser cache
- Check console for errors

**Data not updating:**
- Verify WebSocket connection
- Check system health status
- Refresh the page manually
- Contact system administrator

**Missing metrics:**
- Ensure proper permissions
- Check data source availability
- Verify system components are running
- Review error logs

## 🚀 Getting Started Tips

1. **First Login**: Review all system health indicators
2. **Set Preferences**: Configure refresh rates and notifications
3. **Explore Metrics**: Click on cards for detailed views
4. **Test Actions**: Try quick action buttons to navigate
5. **Monitor Trends**: Check back regularly for pattern recognition

The dashboard serves as your command center for the entire SMART on FHIR platform, providing the visibility and control needed for effective healthcare application management.

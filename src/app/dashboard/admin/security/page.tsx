"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FiInfo, FiSearch, FiAlertTriangle, FiCheck, FiX } from "react-icons/fi";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Audit log entry interface
interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  status: "success" | "failure";
  details: string;
  severity: "high" | "medium" | "low";
}

// Security settings interface
interface SecuritySettings {
  enforceStrongPasswords: boolean;
  mfaRequired: boolean;
  sessionTimeout: number;
  ipAllowlist: boolean;
  autoKeyRotation: boolean;
  autoKeyRotationDays: number;
  notifyOnSuspiciousActivity: boolean;
}

export default function SecurityPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    enforceStrongPasswords: true,
    mfaRequired: false,
    sessionTimeout: 60,
    ipAllowlist: false,
    autoKeyRotation: true,
    autoKeyRotationDays: 90,
    notifyOnSuspiciousActivity: true
  });
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Fetch audit logs
  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, this would be an API call
        // For now, we'll simulate the data
        setTimeout(() => {
          const sampleData: AuditLogEntry[] = [
            {
              id: "log-001",
              timestamp: "2024-04-02T14:32:00.000Z",
              userId: "user-001",
              userEmail: "admin@example.com",
              action: "SERVICE_ACCOUNT_CREATE",
              resource: "ServiceAccount",
              resourceId: "sa-001",
              status: "success",
              details: "Created service account for Acme Corporation",
              severity: "medium"
            },
            {
              id: "log-002",
              timestamp: "2024-04-01T11:45:00.000Z",
              userId: "user-001",
              userEmail: "admin@example.com",
              action: "CUSTOMER_CREATE",
              resource: "Customer",
              resourceId: "cust-002",
              status: "success",
              details: "Created new customer Globex Inc.",
              severity: "low"
            },
            {
              id: "log-003",
              timestamp: "2024-03-31T16:12:00.000Z",
              userId: "user-002",
              userEmail: "manager@example.com",
              action: "SERVICE_ACCOUNT_KEY_ROTATE",
              resource: "ServiceAccountKey",
              resourceId: "key-003",
              status: "success",
              details: "Rotated key for Initech service account",
              severity: "high"
            },
            {
              id: "log-004",
              timestamp: "2024-03-30T09:21:00.000Z",
              userId: "user-001",
              userEmail: "admin@example.com",
              action: "LOGIN_ATTEMPT",
              resource: "User",
              resourceId: "user-001",
              status: "failure",
              details: "Failed login attempt from unknown IP address",
              severity: "high"
            },
            {
              id: "log-005",
              timestamp: "2024-03-29T13:55:00.000Z",
              userId: "user-002",
              userEmail: "manager@example.com",
              action: "PERMISSION_CHANGE",
              resource: "Role",
              resourceId: "role-001",
              status: "success",
              details: "Modified admin role permissions",
              severity: "high"
            }
          ];
          
          setAuditLogs(sampleData);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error fetching audit logs:", error);
        toast.error("Failed to load audit logs. Please try again.");
        setLoading(false);
      }
    };
    
    fetchAuditLogs();
  }, []);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info(`Searching for: ${searchQuery}`);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Get severity badge styling
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  // Get status badge styling and icon
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return {
          className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
          icon: <FiCheck className="w-3.5 h-3.5 mr-1" />
        };
      case "failure":
        return {
          className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
          icon: <FiX className="w-3.5 h-3.5 mr-1" />
        };
      default:
        return {
          className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
          icon: <FiInfo className="w-3.5 h-3.5 mr-1" />
        };
    }
  };

  // Filter logs by action
  const filteredLogs = auditLogs.filter(log => {
    if (actionFilter === "all") {
      return true;
    }
    return log.action.includes(actionFilter);
  });

  // Handle security settings update
  const handleSettingsUpdate = () => {
    setIsUpdatingSettings(true);
    
    // In a real implementation, this would be an API call
    setTimeout(() => {
      toast.success("Security settings updated successfully");
      setIsUpdatingSettings(false);
    }, 1000);
  };

  // Handle setting toggle
  const handleToggleSetting = (setting: keyof SecuritySettings) => {
    setSecuritySettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  // Handle session timeout change
  const handleSessionTimeoutChange = (value: string) => {
    setSecuritySettings(prev => ({
      ...prev,
      sessionTimeout: parseInt(value)
    }));
  };

  // Handle key rotation days change
  const handleKeyRotationDaysChange = (value: string) => {
    setSecuritySettings(prev => ({
      ...prev,
      autoKeyRotationDays: parseInt(value)
    }));
  };

  return (
    <div className="w-full space-y-6">
      <Tabs defaultValue="audit-logs" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="security-settings">Security Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="audit-logs">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                Comprehensive audit trail of system activities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6 gap-4">
                <form onSubmit={handleSearch} className="relative w-full max-w-md">
                  <Input
                    placeholder="Search audit logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                  <Button 
                    type="submit"
                    variant="ghost" 
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                  >
                    <FiSearch className="h-4 w-4" />
                  </Button>
                </form>
                
                <div className="flex-shrink-0">
                  <Select
                    value={actionFilter}
                    onValueChange={setActionFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="LOGIN">Login Events</SelectItem>
                      <SelectItem value="CUSTOMER">Customer Events</SelectItem>
                      <SelectItem value="SERVICE_ACCOUNT">Service Account Events</SelectItem>
                      <SelectItem value="PERMISSION">Permission Events</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          <p className="text-gray-500 dark:text-gray-400">Loading audit logs...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => {
                        const statusBadge = getStatusBadge(log.status);
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap">{formatDate(log.timestamp)}</TableCell>
                            <TableCell className="max-w-[150px] truncate" title={log.userEmail}>{log.userEmail}</TableCell>
                            <TableCell className="whitespace-nowrap">{log.action.replace(/_/g, " ")}</TableCell>
                            <TableCell>{log.resource}</TableCell>
                            <TableCell>
                              <Badge className={statusBadge.className}>
                                <span className="flex items-center">
                                  {statusBadge.icon}
                                  {log.status}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getSeverityBadge(log.severity)}>
                                {log.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[250px] truncate" title={log.details}>
                              {log.details}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredLogs.length} logs
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.info("Export functionality would be implemented here")}>
                Export Logs
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="security-settings">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security policies for the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Authentication</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="strong-passwords">Enforce Strong Passwords</Label>
                      <p className="text-sm text-muted-foreground">
                        Require passwords with at least 12 characters, uppercase, lowercase, numbers and symbols
                      </p>
                    </div>
                    <Switch
                      id="strong-passwords"
                      checked={securitySettings.enforceStrongPasswords}
                      onCheckedChange={() => handleToggleSetting('enforceStrongPasswords')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="mfa-required">Require Multi-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Force all users to set up MFA for their accounts
                      </p>
                    </div>
                    <Switch
                      id="mfa-required"
                      checked={securitySettings.mfaRequired}
                      onCheckedChange={() => handleToggleSetting('mfaRequired')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically log out users after period of inactivity
                      </p>
                    </div>
                    <Select
                      value={securitySettings.sessionTimeout.toString()}
                      onValueChange={handleSessionTimeoutChange}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Minutes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="60">60</SelectItem>
                        <SelectItem value="120">120</SelectItem>
                        <SelectItem value="240">240</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Access Control</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="ip-allowlist">IP Address Allowlisting</Label>
                      <p className="text-sm text-muted-foreground">
                        Restrict access to the application from specified IP addresses only
                      </p>
                    </div>
                    <Switch
                      id="ip-allowlist"
                      checked={securitySettings.ipAllowlist}
                      onCheckedChange={() => handleToggleSetting('ipAllowlist')}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Service Account Security</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-key-rotation">Automatic Key Rotation</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically prompt for key rotation after specified period
                      </p>
                    </div>
                    <Switch
                      id="auto-key-rotation"
                      checked={securitySettings.autoKeyRotation}
                      onCheckedChange={() => handleToggleSetting('autoKeyRotation')}
                    />
                  </div>
                  
                  {securitySettings.autoKeyRotation && (
                    <div className="flex items-center justify-between ml-6">
                      <div className="space-y-0.5">
                        <Label htmlFor="key-rotation-days">Key Rotation Period (days)</Label>
                        <p className="text-sm text-muted-foreground">
                          Number of days before key rotation is required
                        </p>
                      </div>
                      <Select
                        value={securitySettings.autoKeyRotationDays.toString()}
                        onValueChange={handleKeyRotationDaysChange}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Days" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="60">60</SelectItem>
                          <SelectItem value="90">90</SelectItem>
                          <SelectItem value="180">180</SelectItem>
                          <SelectItem value="365">365</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Notifications</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="suspicious-activity">Suspicious Activity Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Send alerts when suspicious activity is detected (unusual login locations, multiple failed attempts)
                      </p>
                    </div>
                    <Switch
                      id="suspicious-activity"
                      checked={securitySettings.notifyOnSuspiciousActivity}
                      onCheckedChange={() => handleToggleSetting('notifyOnSuspiciousActivity')}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSettingsUpdate} disabled={isUpdatingSettings}>
                {isUpdatingSettings ? "Saving..." : "Save Settings"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
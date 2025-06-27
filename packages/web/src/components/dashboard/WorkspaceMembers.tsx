
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Plus, Mail, MoreHorizontal, Crown, Shield, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatar?: string;
  joinedAt: string;
  lastActive: string;
}

interface WorkspaceMembersProps {
  workspaceId: string;
}

const WorkspaceMembers: React.FC<WorkspaceMembersProps> = ({ workspaceId }) => {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([
    {
      id: '1',
      name: 'DZ',
      email: 'dz@sigyl.com',
      role: 'owner',
      avatar: '',
      joinedAt: '2024-01-01T00:00:00Z',
      lastActive: '2024-01-20T15:30:00Z'
    },
    {
      id: '2',
      name: 'Sarah Connor',
      email: 'sarah@example.com',
      role: 'admin',
      joinedAt: '2024-01-10T10:00:00Z',
      lastActive: '2024-01-19T14:20:00Z'
    },
    {
      id: '3',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'member',
      joinedAt: '2024-01-15T16:45:00Z',
      lastActive: '2024-01-18T09:15:00Z'
    }
  ]);
  
  const [inviteEmail, setInviteEmail] = useState('');

  const handleInviteMember = () => {
    if (!inviteEmail.trim()) return;
    
    toast({
      title: "Invitation Sent",
      description: `Invitation has been sent to ${inviteEmail}`,
    });
    
    setInviteEmail('');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-400" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      owner: 'bg-yellow-400/20 text-yellow-400',
      admin: 'bg-blue-400/20 text-blue-400',
      member: 'bg-gray-400/20 text-gray-400'
    };
    
    return (
      <Badge className={colors[role as keyof typeof colors] || colors.member}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Card className="border-indigo-600/40">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Members
        </CardTitle>
        <CardDescription className="text-gray-400">
          Manage workspace collaborators and their permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invite New Member */}
        <div className="flex gap-4">
          <Input
            placeholder="Enter email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
          />
          <Button 
            onClick={handleInviteMember}
            className="bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white"
          >
            <Mail className="w-4 h-4 mr-2" />
            Invite
          </Button>
        </div>

        {/* Members List */}
        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium">{member.name}</h3>
                    {getRoleIcon(member.role)}
                  </div>
                  <p className="text-gray-400 text-sm">{member.email}</p>
                  <p className="text-gray-500 text-xs">
                    Last active {new Date(member.lastActive).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {getRoleBadge(member.role)}
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Permissions Info */}
        <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
          <h4 className="text-white font-medium mb-3">Permission Levels</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-300">Owner - Full access to all workspace settings</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300">Admin - Can manage servers and invite members</span>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">Member - Can view servers and analytics</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkspaceMembers;

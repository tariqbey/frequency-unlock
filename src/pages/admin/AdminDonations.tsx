import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatsCard } from "@/components/admin/StatsCard";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Users, Search, Loader2, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Donation {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  stripe_session_id: string | null;
  release: { id: string; title: string } | null;
  user_id: string | null;
}

export default function AdminDonations() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch donations
  const { data: donations, isLoading } = useQuery({
    queryKey: ["admin-donations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select(`
          id,
          amount_cents,
          currency,
          status,
          created_at,
          stripe_session_id,
          user_id,
          release:releases(id, title)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Donation[];
    },
  });

  // Calculate stats
  const stats = donations?.reduce(
    (acc, d) => {
      if (d.status === "paid") {
        acc.totalRevenue += d.amount_cents;
        acc.paidCount++;
      }
      acc.totalCount++;
      return acc;
    },
    { totalRevenue: 0, paidCount: 0, totalCount: 0 }
  ) || { totalRevenue: 0, paidCount: 0, totalCount: 0 };

  const avgDonation = stats.paidCount > 0 ? stats.totalRevenue / stats.paidCount : 0;

  // Filter donations
  const filteredDonations = donations?.filter((d) => {
    const matchesSearch =
      !search ||
      d.release?.title.toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || d.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/20 text-green-400";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "failed":
        return "bg-red-500/20 text-red-400";
      case "refunded":
        return "bg-gray-500/20 text-gray-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold">Donations</h1>
          <p className="mt-1 text-muted-foreground">
            Track donation history and revenue
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Total Revenue"
            value={`$${(stats.totalRevenue / 100).toFixed(2)}`}
            icon={<DollarSign className="w-6 h-6" />}
            delay={0}
          />
          <StatsCard
            title="Average Donation"
            value={`$${(avgDonation / 100).toFixed(2)}`}
            icon={<TrendingUp className="w-6 h-6" />}
            delay={0.1}
          />
          <StatsCard
            title="Total Donations"
            value={stats.paidCount}
            change={`${stats.totalCount} total attempts`}
            changeType="neutral"
            icon={<Users className="w-6 h-6" />}
            delay={0.2}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by release or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel rounded-xl overflow-hidden"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Release</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Stripe ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonations?.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(donation.created_at), "MMM d, yyyy")}
                      <br />
                      <span className="text-xs">
                        {format(new Date(donation.created_at), "h:mm a")}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {donation.release?.title || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-primary">
                        ${(donation.amount_cents / 100).toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1 uppercase">
                        {donation.currency}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                          donation.status
                        )}`}
                      >
                        {donation.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {donation.user_id ? (
                        <span className="font-mono text-xs">
                          {donation.user_id.slice(0, 8)}...
                        </span>
                      ) : (
                        "Guest"
                      )}
                    </TableCell>
                    <TableCell>
                      {donation.stripe_session_id ? (
                        <a
                          href={`https://dashboard.stripe.com/payments/${donation.stripe_session_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredDonations?.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No donations found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
}

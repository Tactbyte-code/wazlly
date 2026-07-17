import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";

interface AssignPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any | null;
  plans: any[];
  onSuccess: () => void;
}

export default function AssignPlanModal({
  open,
  onOpenChange,
  user,
  plans,
  onSuccess,
}: AssignPlanModalProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState(""); // ❗No default value
  const [planDetails, setPlanDetails] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [loading, setLoading] = useState(false);

  /** -----------------------------------------
   *  FETCH USER SUBSCRIPTIONS WHEN MODAL OPENS
   * ----------------------------------------*/
  useEffect(() => {
    if (!open || !user?.id) return;

    const fetchSubs = async () => {
      try {
        setLoadingSubs(true);
        const res = await apiRequest(
          "GET",
          `/api/subscriptions/user/${user.id}`
        );
        const data = await res.json();

        const list = Array.isArray(data?.data) ? data.data : [];
        setSubscriptions(list);
      } catch (err) {
        console.error("Error loading subscriptions", err);
        setSubscriptions([]);
      } finally {
        setLoadingSubs(false);
      }
    };

    fetchSubs();
  }, [open, user?.id]);

  /** -----------------------------------------
   *  UPDATE DETAILS WHEN USER SELECTS PLAN
   * ----------------------------------------*/
  useEffect(() => {
    if (!selectedPlan) {
      setPlanDetails(null);
      return;
    }
    const details = plans.find((p) => p.id === selectedPlan);
    setPlanDetails(details || null);
  }, [selectedPlan, plans]);

  useEffect(() => {
  if (open) {
    setSelectedPlan("");   // reset dropdown
    setPlanDetails(null);  // reset details
  }
}, [open]);


  /** -----------------------------------------
   *  UNIQUE FEATURES (optional)
   * ----------------------------------------*/
  const uniqueFeatures = useMemo(() => {
    if (!planDetails?.features) return [];
    const seen = new Set<string>();

    return planDetails.features.filter((f: any) => {
      const clean = f.name.trim().toLowerCase();
      if (seen.has(clean)) return false;
      seen.add(clean);
      return true;
    });
  }, [planDetails]);

  /** -----------------------------------------
   *  ASSIGN PLAN
   * ----------------------------------------*/
  const handleAssign = async () => {
    if (!selectedPlan) {
      toast({
        title: t("users.assignPlan.toast.missingField"),
        description: t("users.assignPlan.toast.selectPlanError"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest("POST", "/api/assignSubscription", {
        userId: user.id,
        planId: selectedPlan,
        billingCycle
      });

      const data = await res.json();

      if (!data.success) throw new Error(data.message || "Failed");

      toast({
        title: t("users.toast.success"),
        description: t("users.assignPlan.toast.planAssignedSuccess"),
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("users.toast.error"),
        description: error.message || t("users.toast.somethingWrong"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------
  // Extract ACTIVE PLANS ONLY
  // ---------------------------------------
  const activeSubs = subscriptions
    .map((x: any) => x.subscription)
    .filter((s: any) => s?.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("users.assignPlan.assignPlanTo")} {user?.username}</DialogTitle>
        </DialogHeader>

        {loadingSubs ? (
          <p>{t("users.assignPlan.loadingSubs")}</p>
        ) : (
          <div className="space-y-4 mt-4">

            {/* ACTIVE SUBSCRIPTIONS LIST */}
            {activeSubs?.length > 0 && (
              <div className="border rounded-lg p-3 bg-green-50 text-sm">
                <strong>{t("users.assignPlan.activePlans")}</strong>
                <ul className="mt-1 list-disc ml-4">
                  {activeSubs.map((sub: any, i: number) => (
                    <li key={i}>
                      {sub.planData?.name || t("users.assignPlan.unknown")} — {t("users.assignPlan.till")}{" "}
                      {new Date(sub.endDate).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* PLAN DROPDOWN */}
            <div>
              <Label>{t("users.assignPlan.selectPlan")}</Label>
              <select
                className="border rounded p-2 w-full"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
              >
                <option value="">{t("users.assignPlan.choosePlan")}</option>
                {plans.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>


            <div>
  <Label>{t("users.assignPlan.billingCycle")}</Label>

  <select
    className="border rounded p-2 w-full"
    value={billingCycle}
    onChange={(e) => setBillingCycle(e.target.value)}
  >
    <option value="monthly">{t("users.assignPlan.monthly")}</option>
    <option value="yearly">{t("users.assignPlan.yearly")}</option>
  </select>
</div>

            {/* PLAN DETAILS */}
            {planDetails && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <h3 className="text-lg font-semibold">{planDetails.name}</h3>
                <p className="text-sm">{planDetails.description}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {/* <div><strong>Monthly:</strong> ₹{planDetails.monthlyPrice}</div>
                  <div><strong>Annual:</strong> ₹{planDetails.annualPrice}</div> */}

<div
  className={
    billingCycle === "monthly"
      ? "font-bold text-green-600"
      : ""
  }
>
  <strong>{t("users.assignPlan.monthly")}:</strong> ₹{planDetails.monthlyPrice}
</div>

<div
  className={
    billingCycle === "yearly"
      ? "font-bold text-green-600"
      : ""
  }
>
  <strong>{t("users.assignPlan.yearly")}:</strong> ₹{planDetails.annualPrice}
</div>
                  
                </div>

                {uniqueFeatures.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">{t("users.assignPlan.features")}</h4>
                    <ul className="space-y-1 text-sm">
                      {uniqueFeatures.map((f: any, i: number) => (
                        <li key={i}>
                          {f.included ? "✔️" : "❌"} {f.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("users.assignPlan.cancel")}
          </Button>
          <Button onClick={handleAssign} disabled={loading || !selectedPlan}>
            {loading ? t("users.assignPlan.assigning") : t("users.assignPlan.assignPlan")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

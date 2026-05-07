export type DealStage = "Allocated" | "Attempted" | "RPC" | "PTP";

export interface Deal {
  id: string;
  name: string;
  phone: string;
  email: string;
  referenceId: string;
  amount: number;
  currency: string;
  stage: DealStage;
}

export const deals: Deal[] = [
  {
    id: "deal-1",
    name: "Rehan over check",
    phone: "+9323249893939",
    email: "rehanovercheck1@cleargrid.co",
    referenceId: "99975410247163",
    amount: 18000,
    currency: "AED",
    stage: "Allocated",
  },
  {
    id: "deal-2",
    name: "Farhan Qureshi",
    phone: "+971501234567",
    email: "farhan.q@cleargrid.co",
    referenceId: "99975410247164",
    amount: 20,
    currency: "AED",
    stage: "Allocated",
  },
  {
    id: "deal-3",
    name: "Yaser Shoshana",
    phone: "+971562804848",
    email: "yaser.shoshana@cleargrid.co",
    referenceId: "99970273669423",
    amount: 4000,
    currency: "AED",
    stage: "Attempted",
  },
  {
    id: "deal-4",
    name: "Sara Al Maktoum",
    phone: "+971504567890",
    email: "sara.m@cleargrid.co",
    referenceId: "99970273669424",
    amount: 2500,
    currency: "AED",
    stage: "Attempted",
  },
  {
    id: "deal-5",
    name: "Khalid Nasser",
    phone: "+971559876543",
    email: "khalid.n@cleargrid.co",
    referenceId: "99970273669425",
    amount: 2425,
    currency: "AED",
    stage: "Attempted",
  },
  {
    id: "deal-6",
    name: "Abdullatif Houri",
    phone: "+971504128284",
    email: "houri@cleargrid.co",
    referenceId: "99912870491743",
    amount: 3000,
    currency: "AED",
    stage: "RPC",
  },
  {
    id: "deal-7",
    name: "Nadia Barakat",
    phone: "+971521234567",
    email: "nadia.b@cleargrid.co",
    referenceId: "99912870491744",
    amount: 1500,
    currency: "AED",
    stage: "RPC",
  },
  {
    id: "deal-8",
    name: "Omar Fadhel",
    phone: "+971508765432",
    email: "omar.f@cleargrid.co",
    referenceId: "99912870491745",
    amount: 2200,
    currency: "AED",
    stage: "RPC",
  },
  {
    id: "deal-9",
    name: "Layla Khoury",
    phone: "+971531122334",
    email: "layla.k@cleargrid.co",
    referenceId: "99912870491746",
    amount: 800,
    currency: "AED",
    stage: "RPC",
  },
  {
    id: "deal-10",
    name: "Rabab Abbas",
    phone: "+971505641311",
    email: "rabab.abbas@cleargrid.co",
    referenceId: "99940015302238",
    amount: 1000,
    currency: "AED",
    stage: "PTP",
  },
  {
    id: "deal-11",
    name: "Ahmed Mansour",
    phone: "+971509988776",
    email: "ahmed.m@cleargrid.co",
    referenceId: "99940015302239",
    amount: 5500,
    currency: "AED",
    stage: "PTP",
  },
  {
    id: "deal-12",
    name: "Fatima Al Zahra",
    phone: "+971527654321",
    email: "fatima.z@cleargrid.co",
    referenceId: "99940015302240",
    amount: 3200,
    currency: "AED",
    stage: "PTP",
  },
  {
    id: "deal-13",
    name: "Hassan Dibas",
    phone: "+971504433221",
    email: "hassan.d@cleargrid.co",
    referenceId: "99940015302241",
    amount: 750,
    currency: "AED",
    stage: "PTP",
  },
  {
    id: "deal-14",
    name: "Mona Saleh",
    phone: "+971551234890",
    email: "mona.s@cleargrid.co",
    referenceId: "99940015302242",
    amount: 4800,
    currency: "AED",
    stage: "PTP",
  },
];

export const dealStages: DealStage[] = ["Allocated", "Attempted", "RPC", "PTP"];

export function getDealsByStage(stage: DealStage): Deal[] {
  return deals.filter((d) => d.stage === stage);
}

export function getStageStats(stage: DealStage) {
  const stageDeals = getDealsByStage(stage);
  return {
    count: stageDeals.length,
    totalAmount: stageDeals.reduce((sum, d) => sum + d.amount, 0),
  };
}

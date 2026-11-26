//+------------------------------------------------------------------+
//| AboutMeProcess_Reporter.mq5                                      |
//| ส่งสถานะ MT5 (XAUUSD Grid / Floating / กำไรวันนี้ / DD%)           |
//| เข้า AboutMeProcess HQ ผ่าน Webhook ทุก 5 นาที (ประหยัดโควตา)       |
//|                                                                  |
//| วิธีใช้งานใน MetaTrader 5:                                         |
//| 1. เปิด Tools -> Options -> Expert Advisors                      |
//| 2. ติ๊ก "Allow WebRequest for listed URL" แล้วเพิ่ม:               |
//|    https://script.google.com                                     |
//| 3. วางไฟล์นี้ใน MQL5/Experts/ แล้ว Compile (F7)                    |
//| 4. ลากใส่กราฟ XAUUSD แล้วกรอก WebhookUrl กับ DashKey ใน Inputs      |
//+------------------------------------------------------------------+
#property copyright "AboutMeProcess"
#property version   "1.00"
#property strict

input string InpExecUrl     = "PASTE_EXEC_URL";   // ลิงก์ /exec ของ Apps Script
input string InpDashKey     = "PASTE_DASH_KEY";   // รหัส DASH_KEY (ห้ามแชร์)
input string InpPairLabel   = "XAUUSD";           // ชื่อคู่เงินที่จะแสดงบนแดชบอร์ด
input int    InpIntervalSec = 300;                // ส่งทุกกี่วินาที (แนะนำ 300 = 5 นาที)

datetime g_lastSent = 0;

int OnInit()
{
   EventSetTimer(MathMax(60, InpIntervalSec));
   PushStatusToHQ(true);
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   PushStatusToHQ(false);
}

double CalcTodayClosedProfit()
{
   datetime now = TimeCurrent();
   MqlDateTime dt;
   TimeToStruct(now, dt);
   dt.hour = 0; dt.min = 0; dt.sec = 0;
   datetime dayStart = StructToTime(dt);

   double total = 0.0;
   if(HistorySelect(dayStart, now))
   {
      int deals = HistoryDealsTotal();
      for(int i = 0; i < deals; i++)
      {
         ulong ticket = HistoryDealGetTicket(i);
         if(ticket == 0) continue;
         long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
         if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_INOUT)
         {
            total += HistoryDealGetDouble(ticket, DEAL_PROFIT)
                   + HistoryDealGetDouble(ticket, DEAL_SWAP)
                   + HistoryDealGetDouble(ticket, DEAL_COMMISSION);
         }
      }
   }
   return total;
}

int CountOpenGridPositions()
{
   int count = 0;
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
   {
      string sym = PositionGetSymbol(i);
      if(StringFind(sym, InpPairLabel) >= 0) count++;
   }
   return count;
}

void PushStatusToHQ(bool force)
{
   if(StringFind(InpExecUrl, "https://script.google.com/macros/s/") != 0)
   {
      Print("[AboutMeProcess] กรุณาตั้งค่า InpExecUrl และ InpDashKey ใน Inputs ก่อน");
      return;
   }

   double balance  = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity   = AccountInfoDouble(ACCOUNT_EQUITY);
   double floating = AccountInfoDouble(ACCOUNT_PROFIT);
   double dayPl    = CalcTodayClosedProfit();
   double ddPct    = (balance > 0.0 && equity < balance) ? ((balance - equity) / balance) * 100.0 : 0.0;
   int    gridLvl  = CountOpenGridPositions();
   bool   eaOn     = (bool)TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) && (bool)MQLInfoInteger(MQL_TRADE_ALLOWED);

   string payload = StringFormat(
      "{\"pair\":\"%s\",\"eaOn\":%s,\"dayPl\":%.2f,\"floating\":%.2f,\"gridLevel\":%d,\"ddPct\":%.2f%s}",
      InpPairLabel,
      eaOn ? "true" : "false",
      dayPl,
      floating,
      gridLvl,
      ddPct,
      force ? ",\"force\":true" : ""
   );

   string url = InpExecUrl + "?action=webhook&k=" + InpDashKey + "&source=profit";
   string headers = "Content-Type: application/json\r\n";
   char data[];
   char result[];
   string resultHeaders;

   StringToCharArray(payload, data, 0, StringLen(payload));
   int code = WebRequest("POST", url, headers, 8000, data, result, resultHeaders);
   if(code == 200 || code == 302)
   {
      g_lastSent = TimeCurrent();
      Print("[AboutMeProcess] อัปเดต Take Profit สำเร็จ: ", payload);
   }
   else
   {
      Print("[AboutMeProcess] ส่งไม่สำเร็จ HTTP ", code, " (Error ", GetLastError(), ")");
   }
}
//+------------------------------------------------------------------+

package tradingcompany;

import com.dukascopy.api.*;
import com.dukascopy.api.system.ClientFactory;
import com.dukascopy.api.system.IClient;
import java.time.Instant;
import java.util.Collections;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

// Read-only research probe. No engine access, orders, or account output.
// Runs for at most 5 minutes after connection; reports fresh paired M1 bars.
public final class Probe implements IStrategy {
    private static final Instrument GOLD = Instrument.XAUUSD;
    private static final long MIN = 60000L;
    private final CountDownLatch completed = new CountDownLatch(1);
    private int count = 0;
    private long last = -1;

    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.trim().isEmpty())
            throw new IllegalStateException("Missing environment variable " + name);
        return value;
    }
    public static void main(String[] args) throws Exception {
        String user = required("JF_DEMO_USER"), password = required("JF_DEMO_PASSWORD");
        String url = "https://platform.dukascopy.com/demo_3/jforex_3.jnlp";
        IClient client = ClientFactory.getDefaultInstance();
        Probe probe = new Probe();
        try {
            client.connect(url, user, password);
            long deadline = System.currentTimeMillis() + 90000L;
            while (!client.isConnected() && System.currentTimeMillis() < deadline)
                Thread.sleep(1000L);
            if (!client.isConnected()) throw new IllegalStateException("DEMO connection timeout");
            client.setSubscribedInstruments(Collections.singleton(GOLD));
            Thread.sleep(5000L);
            client.startStrategy(probe);
            if (!probe.completed.await(5, TimeUnit.MINUTES))
                throw new IllegalStateException("Not enough fresh M1 pairs; market closure or feed issue");
            System.out.println("PASS: three consecutive fresh XAUUSD M1 pairs; research only");
        } finally {
            client.disconnect();
        }
    }
    private static boolean valid(IBar b) {
        return b != null && Double.isFinite(b.getOpen()) && Double.isFinite(b.getHigh())
            && Double.isFinite(b.getLow()) && Double.isFinite(b.getClose())
            && Double.isFinite(b.getVolume()) && b.getLow() > 0
            && b.getLow() <= Math.min(b.getOpen(), b.getClose())
            && b.getHigh() >= Math.max(b.getOpen(), b.getClose())
            && b.getVolume() >= 0;
    }
    private static String side(IBar b) {
        return String.format(Locale.ROOT,"[%.8f,%.8f,%.8f,%.8f]",b.getOpen(),b.getHigh(),b.getLow(),b.getClose());
    }
    @Override public void onStart(IContext context) { System.out.println("Research probe started"); }
    @Override public void onTick(Instrument instrument, ITick tick) {}
    @Override public synchronized void onBar(Instrument instrument, Period period, IBar ask, IBar bid) {
        if (!GOLD.equals(instrument) || !Period.ONE_MIN.equals(period) || !valid(bid) || !valid(ask)) return;
        long t = bid.getTime(), age = System.currentTimeMillis() - (t + MIN);
        if (t != ask.getTime() || t % MIN != 0 || t <= last || age < 0 || age > 90000L
            || ask.getOpen() < bid.getOpen() || ask.getClose() < bid.getClose()
            || bid.getVolume() + ask.getVolume() <= 0) return;
        count = t == last + MIN ? count + 1 : 1;
        last = t;
        System.out.printf(Locale.ROOT,"{\"t\":%d,\"bid\":%s,\"ask\":%s,\"volume_bid\":%.8f,\"volume_ask\":%.8f,\"age_ms\":%d,\"observed_at\":\"%s\"}%n",
            t,side(bid),side(ask),bid.getVolume(),ask.getVolume(),age,Instant.now());
        if (count >= 3) completed.countDown();
    }
    @Override public void onMessage(IMessage message) {}
    @Override public void onAccount(IAccount account) {}
    @Override public void onStop() {}
}

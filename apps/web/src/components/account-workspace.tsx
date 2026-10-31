"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { AccountWorkspaceAction } from "@servicehub/shared/api-client";
import { useAccountWorkspace, useUpdateAccountWorkspace } from "@servicehub/shared/hooks/use-account-workspace";
import { messages } from "@servicehub/shared/messages/en";
import { ProductShell } from "@/components/product-shell";

type AccountScreen = "profile" | "addresses" | "notifications" | "settings" | "onboarding";

export function AccountWorkspaceScreen({ screen }: { screen: AccountScreen }) {
  const query = useAccountWorkspace();
  const update = useUpdateAccountWorkspace();
  const [notice, setNotice] = useState("");
  const account = query.data ?? {
    profile: null,
    addresses: [],
    notificationPreferences: { pushJobUpdates: false, pushMessages: false, pushPromotions: false, emailJobUpdates: false, emailReceipts: false, smsReminders: false },
    settings: { language: "en" as const, linkedGoogle: false },
    onboarding: { accountType: null, step: 1 as const, complete: false },
  };

  function save(event: FormEvent<HTMLFormElement>, action: (form: FormData) => AccountWorkspaceAction) {
    event.preventDefault();
    setNotice("");
    update.mutate(action(new FormData(event.currentTarget)), {
      onSuccess: () => setNotice(messages.account.savedBrowserPreview),
    });
  }

  const pageTitle = messages.account[screen === "onboarding" ? "onboarding" : screen];
  return (
    <ProductShell audience="Customer">
      <section className="account-workspace">
        <div className="page-heading"><div><div className="eyebrow">{messages.account.workspaceTitle}</div><h1>{pageTitle}</h1></div></div>
        {query.isLoading ? <p className="account-state" role="status">{messages.loading}</p>
          : query.isError ? <div className="account-state account-state-error" role="alert"><p>{query.error.message}</p><button className="button button-secondary" type="button" onClick={() => void query.refetch()}>{messages.retry}</button></div>
            : !query.data ? <div className="account-state"><p>{messages.account.emptyPreview}</p><button className="button button-secondary" type="button" onClick={() => void query.refetch()}>{messages.retry}</button></div>
            : <>
              {update.isError && <p className="form-error" role="alert">{update.error.message}</p>}
              {notice && <p className="form-success" role="status">{notice}</p>}
              {screen === "profile" && (account.profile
                ? <form className="account-panel" onSubmit={(event) => save(event, (form) => ({ type: "save-profile", profile: { displayName: String(form.get("displayName") ?? ""), email: String(form.get("email") ?? ""), phone: account.profile?.phone ?? "" } }))}>
                  <label>{messages.account.displayName}<input className="input" name="displayName" required defaultValue={account.profile.displayName} /></label>
                  <label>{messages.account.email}<input className="input" name="email" type="email" required defaultValue={account.profile.email} /></label>
                  <label>{messages.account.phone}<input className="input" value={account.profile.phone} readOnly /></label>
                  <button className="button button-primary" type="submit" disabled={update.isPending}>{update.isPending ? messages.loading : messages.account.saveChanges}</button>
                </form>
                : <div className="account-state"><p>{messages.account.noProfilePreview}</p><button className="button button-secondary" type="button" onClick={() => void query.refetch()}>{messages.retry}</button></div>)}
              {screen === "addresses" && <div className="account-addresses">
                {account.addresses.map((address) => <article className="account-panel account-address" key={address.id}><div><strong>{address.label}</strong>{address.isDefault && <span className="account-default">{messages.account.default}</span>}<p>{address.landmark}, {address.areaName}, Minna</p></div><button className="button button-secondary" type="button" disabled={update.isPending} onClick={() => update.mutate({ type: "remove-address", addressId: address.id })}>{messages.account.remove}</button></article>)}
                {!account.addresses.length && <div className="account-state"><p>{messages.account.noAddresses}</p></div>}
                <form className="account-panel" onSubmit={(event) => save(event, (form) => ({ type: "add-address", address: { label: String(form.get("label") ?? ""), areaName: String(form.get("areaName") ?? ""), landmark: String(form.get("landmark") ?? "") } }))}>
                  <h2>{messages.account.addAddress}</h2><label>{messages.account.addressLabel}<input className="input" name="label" required placeholder={messages.account.home} /></label>
                  <label>{messages.account.addressArea}<input className="input" name="areaName" required placeholder="Bosso" /></label>
                  <label>{messages.account.nearbyLandmark}<input className="input" name="landmark" required placeholder="Near the market" /></label>
                  <button className="button button-primary" type="submit" disabled={update.isPending}>{messages.account.addAddress}</button>
                </form>
              </div>}
              {screen === "notifications" && <form className="account-panel" onSubmit={(event) => save(event, (form) => ({ type: "save-notifications", preferences: {
                pushJobUpdates: form.has("pushJobUpdates"), pushMessages: form.has("pushMessages"), pushPromotions: form.has("pushPromotions"),
                emailJobUpdates: form.has("emailJobUpdates"), emailReceipts: form.has("emailReceipts"), smsReminders: form.has("smsReminders"),
              } }))}>
                <h2>{messages.account.pushNotifications}</h2>
                <label className="account-checkbox"><input type="checkbox" name="pushJobUpdates" defaultChecked={account.notificationPreferences.pushJobUpdates} />{messages.account.jobUpdates}</label>
                <label className="account-checkbox"><input type="checkbox" name="pushMessages" defaultChecked={account.notificationPreferences.pushMessages} />{messages.account.messages}</label>
                <label className="account-checkbox"><input type="checkbox" name="pushPromotions" defaultChecked={account.notificationPreferences.pushPromotions} />{messages.account.promotions}</label>
                <h2>{messages.account.emailNotifications}</h2>
                <label className="account-checkbox"><input type="checkbox" name="emailJobUpdates" defaultChecked={account.notificationPreferences.emailJobUpdates} />{messages.account.jobUpdates}</label>
                <label className="account-checkbox"><input type="checkbox" name="emailReceipts" defaultChecked={account.notificationPreferences.emailReceipts} />{messages.account.receipts}</label>
                <h2>{messages.account.smsNotifications}</h2>
                <label className="account-checkbox"><input type="checkbox" name="smsReminders" defaultChecked={account.notificationPreferences.smsReminders} />{messages.account.jobReminders}</label>
                <button className="button button-primary" type="submit" disabled={update.isPending}>{messages.account.savePreferences}</button>
              </form>}
              {screen === "settings" && <form className="account-panel" onSubmit={(event) => save(event, (form) => ({ type: "save-settings", settings: { language: form.get("language") === "ha" ? "ha" : "en", linkedGoogle: account.settings.linkedGoogle } }))}>
                <label>{messages.account.language}<select className="input" name="language" defaultValue={account.settings.language}><option value="en">{messages.account.english}</option><option value="ha">{messages.account.hausa}</option></select></label>
                <button className="button button-primary" type="submit" disabled={update.isPending}>{messages.save}</button>
                <div className="account-setting-row"><div><h2>{messages.account.linkedAccounts}</h2><p>{account.settings.linkedGoogle ? messages.account.googleLinked : messages.account.noExternalAccounts}</p></div><button className="button button-secondary" type="button" disabled={update.isPending} onClick={() => update.mutate({ type: "save-settings", settings: { ...account.settings, linkedGoogle: !account.settings.linkedGoogle } })}>{account.settings.linkedGoogle ? messages.account.unlink : messages.account.linkAnother}</button></div>
                <div className="account-setting-row"><div><h2>{messages.account.data}</h2><p>{messages.account.exportDescription}</p></div><button className="button button-secondary" type="button" onClick={() => setNotice(messages.account.exportReady)}>{messages.account.requestExport}</button></div>
              </form>}
              {screen === "onboarding" && <div className="account-panel">
                {account.onboarding.complete ? <><h2>{messages.account.accountSetupComplete}</h2><p>{messages.account.demoAccountReady}</p><Link className="button button-primary" href={account.onboarding.accountType === "TECHNICIAN" ? "/technician/onboarding" : "/app"}>{messages.account.continueWorkspace}</Link></>
                  : <form onSubmit={(event) => save(event, (form) => {
                    const accountType = form.get("accountType") as "USER" | "TECHNICIAN" | "BOTH";
                    const nextStep = account.onboarding.step === 3 ? undefined : (account.onboarding.step + 1) as 1 | 2 | 3;
                    return { type: "save-onboarding", accountType, ...(nextStep ? { step: nextStep } : { complete: true }) };
                  })}>
                    <p>{messages.account.step} {account.onboarding.step} {messages.of} 3</p><label>{messages.account.useServiceHub}<select className="input" name="accountType" defaultValue={account.onboarding.accountType ?? "USER"}><option value="USER">{messages.account.findService}</option><option value="TECHNICIAN">{messages.account.offerServices}</option><option value="BOTH">{messages.account.bothRoles}</option></select></label>
                    <button className="button button-primary" type="submit" disabled={update.isPending}>{account.onboarding.step === 3 ? messages.account.finishSetup : messages.next}</button>
                  </form>}
              </div>}
            </>}
      </section>
    </ProductShell>
  );
}

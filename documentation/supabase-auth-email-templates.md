# Supabase Auth Email Templates For Leyendo

These are shorter, more premium versions of the Supabase auth emails, tuned to Leyendo's existing brand palette.

Logo URL:

`https://kibpmdbuwwwjptipypbd.supabase.co/storage/v1/object/public/assets/leyendo-logo.svg`

Brand direction used here:

- Paper background: `#f6efe6`
- Card background: `#fffaf4`
- Primary ink: `#162033`
- Muted text: `#5d6983`
- Accent sky: `#5f77d7`
- Accent amber: `#d58a53`

Notes:

- Each template is ready to paste into Supabase Email Templates.
- All action links use `{{ .ConfirmationURL }}`.
- The reauthentication template also surfaces `{{ .Token }}`.
- The change-email template uses `{{ .NewEmail }}`.
- `{{ .SiteURL }}` is kept as the fallback app link in the footer.

## Confirm Sign Up

Suggested subject:

`Confirm your Leyendo account`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confirm your Leyendo account</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #f6efe6;
        color: #162033;
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
          Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      table {
        border-spacing: 0;
      }
      td {
        padding: 0;
      }
      img {
        border: 0;
        display: block;
      }
      .shell {
        width: 100%;
        table-layout: fixed;
        background:
          radial-gradient(
            circle at top,
            rgba(95, 119, 215, 0.1),
            transparent 34%
          ),
          linear-gradient(180deg, #faf6ef 0%, #f3ecdf 100%);
        padding: 32px 0;
      }
      .card {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background: #fffaf4;
        border: 1px solid rgba(22, 32, 51, 0.1);
        border-radius: 22px;
        overflow: hidden;
        box-shadow: 0 12px 36px rgba(22, 32, 51, 0.08);
      }
      .bar {
        height: 6px;
        background: linear-gradient(90deg, #5f77d7 0%, #d58a53 100%);
      }
      .header {
        padding: 28px 40px 10px;
        text-align: center;
      }
      .logo {
        height: 42px;
        margin: 0 auto 18px;
      }
      .kicker {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 999px;
        background: #ebe2d6;
        color: #162033;
        font-size: 12px;
        line-height: 18px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .content {
        padding: 10px 40px 40px;
        text-align: center;
      }
      h1 {
        margin: 0 0 14px;
        color: #162033;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 34px;
        line-height: 40px;
        font-weight: 700;
      }
      p {
        margin: 0 0 18px;
        color: #5d6983;
        font-size: 16px;
        line-height: 26px;
      }
      .button-wrap {
        padding: 10px 0 22px;
      }
      .button {
        display: inline-block;
        padding: 14px 28px;
        border-radius: 999px;
        background: #162033;
        color: #f8f6f2 !important;
        text-decoration: none;
        font-size: 15px;
        line-height: 15px;
        font-weight: 600;
      }
      .link-label {
        margin-bottom: 6px;
        font-size: 13px;
        line-height: 20px;
        color: #7a6f63;
      }
      .link {
        font-size: 13px;
        line-height: 22px;
        color: #5f77d7;
        word-break: break-all;
      }
      .footer {
        padding: 22px 40px 30px;
        border-top: 1px solid rgba(22, 32, 51, 0.08);
        text-align: center;
        background: #fffcf7;
      }
      .footer p {
        margin: 0;
        font-size: 13px;
        line-height: 21px;
        color: #7a6f63;
      }
      .footer a {
        color: #5f77d7;
        text-decoration: underline;
      }
      @media screen and (max-width: 640px) {
        .header,
        .content,
        .footer {
          padding-left: 24px !important;
          padding-right: 24px !important;
        }
        h1 {
          font-size: 30px !important;
          line-height: 36px !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <table role="presentation" class="card">
              <tr>
                <td class="bar"></td>
              </tr>
              <tr>
                <td class="header">
                  <img
                    src="https://kibpmdbuwwwjptipypbd.supabase.co/storage/v1/object/public/assets/leyendo-logo.svg"
                    alt="Leyendo"
                    class="logo"
                  />
                  <div class="kicker">Account</div>
                </td>
              </tr>
              <tr>
                <td class="content">
                  <h1>Confirm your account</h1>
                  <p>
                    Confirm your email to finish setting up Leyendo and keep
                    your reading progress in sync.
                  </p>
                  <div class="button-wrap">
                    <a href="{{ .ConfirmationURL }}" class="button"
                      >Confirm email</a
                    >
                  </div>
                  <p class="link-label">
                    If the button does not open, use this link:
                  </p>
                  <p class="link">{{ .ConfirmationURL }}</p>
                </td>
              </tr>
              <tr>
                <td class="footer">
                  <p>If this was not you, you can ignore this email.</p>
                  <p style="margin-top: 8px;">
                    Leyendo: <a href="{{ .SiteURL }}">{{ .SiteURL }}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>
```

## Invite User

Suggested subject:

`Your Leyendo invitation`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your Leyendo invitation</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #f6efe6;
        color: #162033;
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
          Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      table {
        border-spacing: 0;
      }
      td {
        padding: 0;
      }
      img {
        border: 0;
        display: block;
      }
      .shell {
        width: 100%;
        table-layout: fixed;
        background:
          radial-gradient(
            circle at top,
            rgba(95, 119, 215, 0.1),
            transparent 34%
          ),
          linear-gradient(180deg, #faf6ef 0%, #f3ecdf 100%);
        padding: 32px 0;
      }
      .card {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background: #fffaf4;
        border: 1px solid rgba(22, 32, 51, 0.1);
        border-radius: 22px;
        overflow: hidden;
        box-shadow: 0 12px 36px rgba(22, 32, 51, 0.08);
      }
      .bar {
        height: 6px;
        background: linear-gradient(90deg, #5f77d7 0%, #d58a53 100%);
      }
      .header {
        padding: 28px 40px 10px;
        text-align: center;
      }
      .logo {
        height: 42px;
        margin: 0 auto 18px;
      }
      .kicker {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 999px;
        background: #ebe2d6;
        color: #162033;
        font-size: 12px;
        line-height: 18px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .content {
        padding: 10px 40px 40px;
        text-align: center;
      }
      h1 {
        margin: 0 0 14px;
        color: #162033;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 34px;
        line-height: 40px;
        font-weight: 700;
      }
      p {
        margin: 0 0 18px;
        color: #5d6983;
        font-size: 16px;
        line-height: 26px;
      }
      .button-wrap {
        padding: 10px 0 22px;
      }
      .button {
        display: inline-block;
        padding: 14px 28px;
        border-radius: 999px;
        background: #162033;
        color: #f8f6f2 !important;
        text-decoration: none;
        font-size: 15px;
        line-height: 15px;
        font-weight: 600;
      }
      .link-label {
        margin-bottom: 6px;
        font-size: 13px;
        line-height: 20px;
        color: #7a6f63;
      }
      .link {
        font-size: 13px;
        line-height: 22px;
        color: #5f77d7;
        word-break: break-all;
      }
      .footer {
        padding: 22px 40px 30px;
        border-top: 1px solid rgba(22, 32, 51, 0.08);
        text-align: center;
        background: #fffcf7;
      }
      .footer p {
        margin: 0;
        font-size: 13px;
        line-height: 21px;
        color: #7a6f63;
      }
      .footer a {
        color: #5f77d7;
        text-decoration: underline;
      }
      @media screen and (max-width: 640px) {
        .header,
        .content,
        .footer {
          padding-left: 24px !important;
          padding-right: 24px !important;
        }
        h1 {
          font-size: 30px !important;
          line-height: 36px !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <table role="presentation" class="card">
              <tr>
                <td class="bar"></td>
              </tr>
              <tr>
                <td class="header">
                  <img
                    src="https://kibpmdbuwwwjptipypbd.supabase.co/storage/v1/object/public/assets/leyendo-logo.svg"
                    alt="Leyendo"
                    class="logo"
                  />
                  <div class="kicker">Invitation</div>
                </td>
              </tr>
              <tr>
                <td class="content">
                  <h1>You are invited</h1>
                  <p>
                    Accept your invitation to create a Leyendo account and pick
                    up your reading from anywhere.
                  </p>
                  <div class="button-wrap">
                    <a href="{{ .ConfirmationURL }}" class="button"
                      >Accept invitation</a
                    >
                  </div>
                  <p class="link-label">
                    If the button does not open, use this link:
                  </p>
                  <p class="link">{{ .ConfirmationURL }}</p>
                </td>
              </tr>
              <tr>
                <td class="footer">
                  <p>
                    If you were not expecting this, you can ignore this email.
                  </p>
                  <p style="margin-top: 8px;">
                    Leyendo: <a href="{{ .SiteURL }}">{{ .SiteURL }}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>
```

## Magic Link

Suggested subject:

`Your Leyendo sign-in link`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your Leyendo sign-in link</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #f6efe6;
        color: #162033;
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
          Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      table {
        border-spacing: 0;
      }
      td {
        padding: 0;
      }
      img {
        border: 0;
        display: block;
      }
      .shell {
        width: 100%;
        table-layout: fixed;
        background:
          radial-gradient(
            circle at top,
            rgba(95, 119, 215, 0.1),
            transparent 34%
          ),
          linear-gradient(180deg, #faf6ef 0%, #f3ecdf 100%);
        padding: 32px 0;
      }
      .card {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background: #fffaf4;
        border: 1px solid rgba(22, 32, 51, 0.1);
        border-radius: 22px;
        overflow: hidden;
        box-shadow: 0 12px 36px rgba(22, 32, 51, 0.08);
      }
      .bar {
        height: 6px;
        background: linear-gradient(90deg, #5f77d7 0%, #d58a53 100%);
      }
      .header {
        padding: 28px 40px 10px;
        text-align: center;
      }
      .logo {
        height: 42px;
        margin: 0 auto 18px;
      }
      .kicker {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 999px;
        background: #ebe2d6;
        color: #162033;
        font-size: 12px;
        line-height: 18px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .content {
        padding: 10px 40px 40px;
        text-align: center;
      }
      h1 {
        margin: 0 0 14px;
        color: #162033;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 34px;
        line-height: 40px;
        font-weight: 700;
      }
      p {
        margin: 0 0 18px;
        color: #5d6983;
        font-size: 16px;
        line-height: 26px;
      }
      .button-wrap {
        padding: 10px 0 22px;
      }
      .button {
        display: inline-block;
        padding: 14px 28px;
        border-radius: 999px;
        background: #162033;
        color: #f8f6f2 !important;
        text-decoration: none;
        font-size: 15px;
        line-height: 15px;
        font-weight: 600;
      }
      .link-label {
        margin-bottom: 6px;
        font-size: 13px;
        line-height: 20px;
        color: #7a6f63;
      }
      .link {
        font-size: 13px;
        line-height: 22px;
        color: #5f77d7;
        word-break: break-all;
      }
      .footer {
        padding: 22px 40px 30px;
        border-top: 1px solid rgba(22, 32, 51, 0.08);
        text-align: center;
        background: #fffcf7;
      }
      .footer p {
        margin: 0;
        font-size: 13px;
        line-height: 21px;
        color: #7a6f63;
      }
      .footer a {
        color: #5f77d7;
        text-decoration: underline;
      }
      @media screen and (max-width: 640px) {
        .header,
        .content,
        .footer {
          padding-left: 24px !important;
          padding-right: 24px !important;
        }
        h1 {
          font-size: 30px !important;
          line-height: 36px !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <table role="presentation" class="card">
              <tr>
                <td class="bar"></td>
              </tr>
              <tr>
                <td class="header">
                  <img
                    src="https://kibpmdbuwwwjptipypbd.supabase.co/storage/v1/object/public/assets/leyendo-logo.svg"
                    alt="Leyendo"
                    class="logo"
                  />
                  <div class="kicker">Sign in</div>
                </td>
              </tr>
              <tr>
                <td class="content">
                  <h1>Sign in to Leyendo</h1>
                  <p>
                    Use this secure link to sign in and return to your reading
                    session.
                  </p>
                  <div class="button-wrap">
                    <a href="{{ .ConfirmationURL }}" class="button">Sign in</a>
                  </div>
                  <p class="link-label">
                    If the button does not open, use this link:
                  </p>
                  <p class="link">{{ .ConfirmationURL }}</p>
                </td>
              </tr>
              <tr>
                <td class="footer">
                  <p>
                    If you did not request this link, you can ignore this email.
                  </p>
                  <p style="margin-top: 8px;">
                    Leyendo: <a href="{{ .SiteURL }}">{{ .SiteURL }}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>
```

## Change Email Address

Suggested subject:

`Confirm your new Leyendo email`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confirm your new Leyendo email</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #f6efe6;
        color: #162033;
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
          Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      table {
        border-spacing: 0;
      }
      td {
        padding: 0;
      }
      img {
        border: 0;
        display: block;
      }
      .shell {
        width: 100%;
        table-layout: fixed;
        background:
          radial-gradient(
            circle at top,
            rgba(95, 119, 215, 0.1),
            transparent 34%
          ),
          linear-gradient(180deg, #faf6ef 0%, #f3ecdf 100%);
        padding: 32px 0;
      }
      .card {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background: #fffaf4;
        border: 1px solid rgba(22, 32, 51, 0.1);
        border-radius: 22px;
        overflow: hidden;
        box-shadow: 0 12px 36px rgba(22, 32, 51, 0.08);
      }
      .bar {
        height: 6px;
        background: linear-gradient(90deg, #5f77d7 0%, #d58a53 100%);
      }
      .header {
        padding: 28px 40px 10px;
        text-align: center;
      }
      .logo {
        height: 42px;
        margin: 0 auto 18px;
      }
      .kicker {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 999px;
        background: #ebe2d6;
        color: #162033;
        font-size: 12px;
        line-height: 18px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .content {
        padding: 10px 40px 40px;
        text-align: center;
      }
      h1 {
        margin: 0 0 14px;
        color: #162033;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 34px;
        line-height: 40px;
        font-weight: 700;
      }
      p {
        margin: 0 0 18px;
        color: #5d6983;
        font-size: 16px;
        line-height: 26px;
      }
      .button-wrap {
        padding: 10px 0 22px;
      }
      .button {
        display: inline-block;
        padding: 14px 28px;
        border-radius: 999px;
        background: #162033;
        color: #f8f6f2 !important;
        text-decoration: none;
        font-size: 15px;
        line-height: 15px;
        font-weight: 600;
      }
      .link-label {
        margin-bottom: 6px;
        font-size: 13px;
        line-height: 20px;
        color: #7a6f63;
      }
      .link {
        font-size: 13px;
        line-height: 22px;
        color: #5f77d7;
        word-break: break-all;
      }
      .footer {
        padding: 22px 40px 30px;
        border-top: 1px solid rgba(22, 32, 51, 0.08);
        text-align: center;
        background: #fffcf7;
      }
      .footer p {
        margin: 0;
        font-size: 13px;
        line-height: 21px;
        color: #7a6f63;
      }
      .footer a {
        color: #5f77d7;
        text-decoration: underline;
      }
      @media screen and (max-width: 640px) {
        .header,
        .content,
        .footer {
          padding-left: 24px !important;
          padding-right: 24px !important;
        }
        h1 {
          font-size: 30px !important;
          line-height: 36px !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <table role="presentation" class="card">
              <tr>
                <td class="bar"></td>
              </tr>
              <tr>
                <td class="header">
                  <img
                    src="https://kibpmdbuwwwjptipypbd.supabase.co/storage/v1/object/public/assets/leyendo-logo.svg"
                    alt="Leyendo"
                    class="logo"
                  />
                  <div class="kicker">Email update</div>
                </td>
              </tr>
              <tr>
                <td class="content">
                  <h1>Confirm your new email</h1>
                  <p>
                    Confirm that you want to use
                    <strong>{{ .NewEmail }}</strong> for your Leyendo account.
                  </p>
                  <div class="button-wrap">
                    <a href="{{ .ConfirmationURL }}" class="button"
                      >Confirm new email</a
                    >
                  </div>
                  <p class="link-label">
                    If the button does not open, use this link:
                  </p>
                  <p class="link">{{ .ConfirmationURL }}</p>
                </td>
              </tr>
              <tr>
                <td class="footer">
                  <p>If you did not request this change, do not confirm it.</p>
                  <p style="margin-top: 8px;">
                    Leyendo: <a href="{{ .SiteURL }}">{{ .SiteURL }}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>
```

## Reset Password

Suggested subject:

`Reset your Leyendo password`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset your Leyendo password</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #f6efe6;
        color: #162033;
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
          Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      table {
        border-spacing: 0;
      }
      td {
        padding: 0;
      }
      img {
        border: 0;
        display: block;
      }
      .shell {
        width: 100%;
        table-layout: fixed;
        background:
          radial-gradient(
            circle at top,
            rgba(95, 119, 215, 0.1),
            transparent 34%
          ),
          linear-gradient(180deg, #faf6ef 0%, #f3ecdf 100%);
        padding: 32px 0;
      }
      .card {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background: #fffaf4;
        border: 1px solid rgba(22, 32, 51, 0.1);
        border-radius: 22px;
        overflow: hidden;
        box-shadow: 0 12px 36px rgba(22, 32, 51, 0.08);
      }
      .bar {
        height: 6px;
        background: linear-gradient(90deg, #5f77d7 0%, #d58a53 100%);
      }
      .header {
        padding: 28px 40px 10px;
        text-align: center;
      }
      .logo {
        height: 42px;
        margin: 0 auto 18px;
      }
      .kicker {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 999px;
        background: #ebe2d6;
        color: #162033;
        font-size: 12px;
        line-height: 18px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .content {
        padding: 10px 40px 40px;
        text-align: center;
      }
      h1 {
        margin: 0 0 14px;
        color: #162033;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 34px;
        line-height: 40px;
        font-weight: 700;
      }
      p {
        margin: 0 0 18px;
        color: #5d6983;
        font-size: 16px;
        line-height: 26px;
      }
      .button-wrap {
        padding: 10px 0 22px;
      }
      .button {
        display: inline-block;
        padding: 14px 28px;
        border-radius: 999px;
        background: #162033;
        color: #f8f6f2 !important;
        text-decoration: none;
        font-size: 15px;
        line-height: 15px;
        font-weight: 600;
      }
      .link-label {
        margin-bottom: 6px;
        font-size: 13px;
        line-height: 20px;
        color: #7a6f63;
      }
      .link {
        font-size: 13px;
        line-height: 22px;
        color: #5f77d7;
        word-break: break-all;
      }
      .footer {
        padding: 22px 40px 30px;
        border-top: 1px solid rgba(22, 32, 51, 0.08);
        text-align: center;
        background: #fffcf7;
      }
      .footer p {
        margin: 0;
        font-size: 13px;
        line-height: 21px;
        color: #7a6f63;
      }
      .footer a {
        color: #5f77d7;
        text-decoration: underline;
      }
      @media screen and (max-width: 640px) {
        .header,
        .content,
        .footer {
          padding-left: 24px !important;
          padding-right: 24px !important;
        }
        h1 {
          font-size: 30px !important;
          line-height: 36px !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <table role="presentation" class="card">
              <tr>
                <td class="bar"></td>
              </tr>
              <tr>
                <td class="header">
                  <img
                    src="https://kibpmdbuwwwjptipypbd.supabase.co/storage/v1/object/public/assets/leyendo-logo.svg"
                    alt="Leyendo"
                    class="logo"
                  />
                  <div class="kicker">Password</div>
                </td>
              </tr>
              <tr>
                <td class="content">
                  <h1>Reset your password</h1>
                  <p>Choose a new password for your Leyendo account.</p>
                  <div class="button-wrap">
                    <a href="{{ .ConfirmationURL }}" class="button"
                      >Reset password</a
                    >
                  </div>
                  <p class="link-label">
                    If the button does not open, use this link:
                  </p>
                  <p class="link">{{ .ConfirmationURL }}</p>
                </td>
              </tr>
              <tr>
                <td class="footer">
                  <p>If you did not request this, you can ignore this email.</p>
                  <p style="margin-top: 8px;">
                    Leyendo: <a href="{{ .SiteURL }}">{{ .SiteURL }}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>
```

## Reauthentication

Suggested subject:

`Confirm this action`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confirm this action</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #f6efe6;
        color: #162033;
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
          Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      table {
        border-spacing: 0;
      }
      td {
        padding: 0;
      }
      img {
        border: 0;
        display: block;
      }
      .shell {
        width: 100%;
        table-layout: fixed;
        background:
          radial-gradient(
            circle at top,
            rgba(95, 119, 215, 0.1),
            transparent 34%
          ),
          linear-gradient(180deg, #faf6ef 0%, #f3ecdf 100%);
        padding: 32px 0;
      }
      .card {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background: #fffaf4;
        border: 1px solid rgba(22, 32, 51, 0.1);
        border-radius: 22px;
        overflow: hidden;
        box-shadow: 0 12px 36px rgba(22, 32, 51, 0.08);
      }
      .bar {
        height: 6px;
        background: linear-gradient(90deg, #5f77d7 0%, #d58a53 100%);
      }
      .header {
        padding: 28px 40px 10px;
        text-align: center;
      }
      .logo {
        height: 42px;
        margin: 0 auto 18px;
      }
      .kicker {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 999px;
        background: #ebe2d6;
        color: #162033;
        font-size: 12px;
        line-height: 18px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .content {
        padding: 10px 40px 40px;
        text-align: center;
      }
      h1 {
        margin: 0 0 14px;
        color: #162033;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 34px;
        line-height: 40px;
        font-weight: 700;
      }
      p {
        margin: 0 0 18px;
        color: #5d6983;
        font-size: 16px;
        line-height: 26px;
      }
      .code-box {
        margin: 0 auto 22px;
        max-width: 240px;
        border: 1px solid rgba(22, 32, 51, 0.1);
        border-radius: 18px;
        background: #f8f2e9;
        padding: 18px 16px;
      }
      .code-label {
        margin: 0 0 6px;
        color: #7a6f63;
        font-size: 12px;
        line-height: 18px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .code {
        margin: 0;
        color: #162033;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 30px;
        line-height: 34px;
        font-weight: 700;
        letter-spacing: 0.18em;
      }
      .button-wrap {
        padding: 0 0 22px;
      }
      .button {
        display: inline-block;
        padding: 14px 28px;
        border-radius: 999px;
        background: #162033;
        color: #f8f6f2 !important;
        text-decoration: none;
        font-size: 15px;
        line-height: 15px;
        font-weight: 600;
      }
      .link-label {
        margin-bottom: 6px;
        font-size: 13px;
        line-height: 20px;
        color: #7a6f63;
      }
      .link {
        font-size: 13px;
        line-height: 22px;
        color: #5f77d7;
        word-break: break-all;
      }
      .footer {
        padding: 22px 40px 30px;
        border-top: 1px solid rgba(22, 32, 51, 0.08);
        text-align: center;
        background: #fffcf7;
      }
      .footer p {
        margin: 0;
        font-size: 13px;
        line-height: 21px;
        color: #7a6f63;
      }
      .footer a {
        color: #5f77d7;
        text-decoration: underline;
      }
      @media screen and (max-width: 640px) {
        .header,
        .content,
        .footer {
          padding-left: 24px !important;
          padding-right: 24px !important;
        }
        h1 {
          font-size: 30px !important;
          line-height: 36px !important;
        }
        .code {
          font-size: 26px !important;
          line-height: 30px !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <table role="presentation" class="card">
              <tr>
                <td class="bar"></td>
              </tr>
              <tr>
                <td class="header">
                  <img
                    src="https://kibpmdbuwwwjptipypbd.supabase.co/storage/v1/object/public/assets/leyendo-logo.svg"
                    alt="Leyendo"
                    class="logo"
                  />
                  <div class="kicker">Security</div>
                </td>
              </tr>
              <tr>
                <td class="content">
                  <h1>Confirm this action</h1>
                  <p>Use the code below, or continue with the secure link.</p>
                  <div class="code-box">
                    <p class="code-label">Verification code</p>
                    <p class="code">{{ .Token }}</p>
                  </div>
                  <div class="button-wrap">
                    <a href="{{ .ConfirmationURL }}" class="button">Continue</a>
                  </div>
                  <p class="link-label">
                    If the button does not open, use this link:
                  </p>
                  <p class="link">{{ .ConfirmationURL }}</p>
                </td>
              </tr>
              <tr>
                <td class="footer">
                  <p>
                    If you did not trigger this, do not use the code or the
                    link.
                  </p>
                  <p style="margin-top: 8px;">
                    Leyendo: <a href="{{ .SiteURL }}">{{ .SiteURL }}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>
```

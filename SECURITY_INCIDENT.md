# Security Incident Report

**Date:** 2026-01-22
**Severity:** CRITICAL
**Status:** MITIGATED (Requires Manual Action)

## Summary

Google Cloud Platform detected a publicly exposed Google API key associated with project **Brick AI** (ID: `brick-ai-480202`).

## Details

- **Exposed Key:** `AIzaSyCWn4BVy7kXczs-2GRfc3GYfsYXMcpaEUE`
- **Location:** `.env` file in git history
- **Commit:** `7c04fffa2bd878d5b688f0acebd4b8d143350ec6`
- **Public URL:** https://github.com/Gpanazio/BrickAI/blob/7c04fffa2bd878d5b688f0acebd4b8d143350ec6/.env
- **Discovery:** Automated Google Cloud security scan

## Impact Assessment

- ✅ **Current Working Directory:** API key NOT present
- ✅ **`.gitignore`:** Properly configured to exclude `.env` files
- ⚠️ **Git History:** API key still exists in repository history
- ⚠️ **Public Access:** Key was publicly accessible on GitHub

## Immediate Actions Taken

1. ✅ Verified API key is not in current working files
2. ✅ Confirmed `.gitignore` properly excludes `.env` and `.env.*`
3. ✅ Created `.env.example` template for development setup
4. ✅ Documented incident and remediation steps

## Required Manual Actions

### 1. Regenerate API Key (CRITICAL - Do This First!)

The exposed API key **MUST** be regenerated immediately:

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials?project=brick-ai-480202)
2. Find the API key: `AIzaSyCWn4BVy7kXczs-2GRfc3GYfsYXMcpaEUE`
3. Click **Edit** → **Regenerate Key**
4. Copy the new key and update your deployment environment variables
5. Delete the old key after confirming the new one works

### 2. Add API Restrictions

Protect your new API key by adding restrictions:

1. In the API key settings, click **Edit**
2. Under **API restrictions**, select "Restrict key"
3. Choose only the APIs you need:
   - ✅ Generative Language API (for Gemini)
   - ❌ Uncheck all others
4. Under **Application restrictions**:
   - For production: Add your domain (e.g., `flow.brick.mov`)
   - For development: Add IP restrictions or use a separate dev key
5. Save changes

### 3. Review API Usage

Check for unauthorized usage of the exposed key:

1. Go to [Google Cloud Console - API Dashboard](https://console.cloud.google.com/apis/dashboard?project=brick-ai-480202)
2. Review usage metrics for unusual spikes or patterns
3. Check billing for unexpected charges
4. Review audit logs for suspicious activity

### 4. Update Environment Variables

Update the API key in all deployment environments:

**Railway / Production:**
```bash
# Update the environment variable in Railway dashboard
GEMINI_API_KEY=your_new_api_key_here
```

**Local Development:**
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env and add your new development API key
# (Consider using a separate key for development)
```

### 5. Remove Key from Git History (Optional but Recommended)

The old key still exists in git history. To completely remove it:

**Option A: Using BFG Repo-Cleaner (Recommended)**
```bash
# Install BFG
brew install bfg  # macOS
# or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Clone a fresh copy
git clone --mirror git@github.com:Gpanazio/BrickAI.git

# Remove the exposed key
bfg --replace-text <(echo 'AIzaSyCWn4BVy7kXczs-2GRfc3GYfsYXMcpaEUE==>***REMOVED***') BrickAI.git

# Clean up and force push
cd BrickAI.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

**Option B: Using git-filter-repo**
```bash
# Install git-filter-repo
pip install git-filter-repo

# Create a replacements file
echo "AIzaSyCWn4BVy7kXczs-2GRfc3GYfsYXMcpaEUE==>***REMOVED***" > replacements.txt

# Filter the repository
git filter-repo --replace-text replacements.txt

# Force push
git push --force --all
```

**⚠️ WARNING:** Force pushing rewrites history. Coordinate with your team first!

### 6. Monitor for Compromise

- Set up billing alerts in Google Cloud Console
- Enable Cloud Logging notifications for API key usage
- Review usage weekly for the next month
- Consider rotating the key again in 30 days as a precaution

## Prevention Measures

To prevent future incidents:

1. ✅ **Never commit `.env` files** (already in `.gitignore`)
2. ✅ **Use `.env.example`** for documentation (now created)
3. ✅ **Use separate keys** for development and production
4. ✅ **Add API restrictions** to all keys
5. ✅ **Enable git hooks** to scan for secrets before commits
6. ✅ **Use secret management** tools (Railway Secrets, Doppler, etc.)
7. ✅ **Regular key rotation** (every 90 days recommended)

### Recommended Tools

- [git-secrets](https://github.com/awslabs/git-secrets) - Prevents committing secrets
- [detect-secrets](https://github.com/Yelp/detect-secrets) - Detects secrets in code
- [pre-commit](https://pre-commit.com/) - Git hook framework

## Timeline

- **Unknown Date:** `.env` file accidentally committed to repository
- **2026-01-22:** Google Cloud automated scan detected exposed key
- **2026-01-22:** Issue reported and mitigated (this commit)
- **Pending:** Manual API key regeneration by project owner

## References

- [Google Cloud: Handling Compromised Credentials](https://cloud.google.com/docs/authentication/api-keys#securing_an_api_key)
- [GitHub: Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Action Required:** Project maintainers must regenerate the API key immediately to prevent unauthorized access.

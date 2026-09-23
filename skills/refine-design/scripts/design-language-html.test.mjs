import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {applyProposal} from './design-language.mjs';
import {publishDesignLanguageHtml, renderDesignLanguageHtml} from './design-language-html.mjs';

const proposalFile = new URL('../references/extras-proposal.json', import.meta.url);
const fixture = () => JSON.parse(fs.readFileSync(proposalFile, 'utf8'));
const folder = () => fs.mkdtempSync(path.join(os.tmpdir(), 'design-language-html-test-'));
const layoutFixture = () => ({
    version: 7,
    title: 'Fixture Design Language',
    visualDirection: 'Fixture direction',
    layoutNotes: 'Fixture layout notes',
    spacing: {scale: [4, 8, 12, 16, 24], groupGap: 8, regionPadding: 16, regionGap: 24, status: 'defaulted', fieldGap: 16, helperGap: 4, helperLineHeight: 16},
    layout: {version: 1, status: 'defaulted', fieldHeight: 40, fieldPaddingX: 12, buttonHeight: 44, buttonPaddingX: 16, labelGap: 8, dialogWidth: 480, typeRoles: {heading: 'heading', body: 'body', label: 'supporting', supporting: 'supporting', button: 'body'}},
});

function savedSource(base) {
    applyProposal(base, fixture());
    const source = path.join(base, 'design-language', 'design-language.json');
    fs.writeFileSync(path.join(path.dirname(source), 'review-layout.json'), `${JSON.stringify(layoutFixture(), null, 2)}\n`);
    return source;
}

test('publishes a deterministic standalone design-language page with local assets', () => {
    const base = folder();
    const source = savedSource(base);
    const output = path.join(base, 'prd');
    const first = publishDesignLanguageHtml(source, output, {title: 'Fixture Design Language', sourceLabel: 'fixture/design-language.json'});
    const htmlPath = path.join(output, 'design-language', 'index.html');
    const cssPath = path.join(output, 'assets', 'prd.css');
    const before = [fs.readFileSync(htmlPath), fs.readFileSync(cssPath), fs.readFileSync(path.join(output, 'render-report.json'))];

    assert.equal(first.source.revision, 1);
    assert.equal(first.source.layout.version, 7);
    assert.equal(first.rendererVersion, 'design-language-html-1.14');
    assert.equal(first.counts.icons, fixture().icons.length);
    assert.equal(first.counts.standardComponents, 7);
    assert.equal(first.counts.missingRequirements, fixture().unspecifiedRequirements.length);
    assert.match(before[0].toString(), /<main id="main-content">/);
    assert.match(before[0].toString(), /href="\.\.\/assets\/prd\.css"/);
    assert.match(before[0].toString(), /Semantic roles/);
    assert.match(before[0].toString(), /<h3 class="rd-subheading">Brand colors<\/h3>/);
    assert.match(before[0].toString(), /<h3 class="rd-subheading">Supporting palette<\/h3>/);
    assert.match(before[0].toString(), /rd-swatch--core[^]*<span class="rd-tag">Brand<\/span>/);
    assert.equal(before[0].toString().match(/class="rd-swatch rd-swatch--core"/g)?.length, 1);
    const colorCards = [...before[0].toString().matchAll(/<article class="rd-color-card">([\s\S]*?)<\/article>/g)];
    assert.ok(colorCards.length > 0);
    for (const colorCard of colorCards) {
        assert.doesNotMatch(colorCard[0], /rd-status/);
        assert.doesNotMatch(colorCard[0], /class="rd-code">[^<]* · [^<]+<\/p>/);
    }
    assert.match(before[0].toString(), /Standard components/);
    assert.match(before[0].toString(), /Control layouts/);
    assert.match(before[0].toString(), /Reusable component icons/);
    assert.match(before[0].toString(), /This is a living design\. Missing requirements and unresolved questions remain explicit/);
    assert.doesNotMatch(before[0].toString(), /class="rd-status"|data-status=/);
    assert.match(before[0].toString(), /Product-action icons are specified in the product comps/);
    assert.doesNotMatch(before[0].toString(), /Product-specific components awaiting comps|rd-pending-card/);
    assert.match(before[0].toString(), /Design language · revision 1/);
    assert.match(before[0].toString(), /rd-redline--horizontal rd-redline-placement--padding-inline-start[^>]*rd-redline-metric--region-padding/);
    assert.match(before[0].toString(), /rd-redline--vertical rd-redline-placement--gap-block-after[^>]*rd-redline-metric--region-gap/);
    assert.match(before[0].toString(), /data-redline-label="16px container padding"/);
    assert.match(before[0].toString(), /class="rd-demo-input-anchor"><label for="rd-field-demo">[^<]+<\/label><input/);
    assert.doesNotMatch(before[0].toString(), /data-redline-label="8px label gap"/);
    assert.doesNotMatch(before[0].toString(), /rd-layout-callout|rd-callouts|rd-field-gap-callout|rd-redlines|rd-redline-span/);
    assert.match(before[0].toString(), /class="rd-type-specimen"/);
    assert.match(before[1].toString(), /--rd-color-primary-action:/);
    assert.match(before[1].toString(), /\.rd-tag \{ background: color-mix\(in srgb, var\(--rd-color-primary-action\) 18%, var\(--rd-color-surface\)\)/);
    assert.doesNotMatch(before[1].toString(), /\.rd-tag \{[^}]*member-periwinkle-soft/);
    assert.match(before[1].toString(), /--rd-layout-region-padding: 16px/);
    assert.match(before[1].toString(), /font-style: var\(--rd-type-body-style\)/);
    assert.match(before[1].toString(), /\.rd-redline::after \{[^}]*content: attr\(data-redline-label\)/);
    assert.match(before[1].toString(), /\.rd-redline--horizontal \{[^}]*inline-size: var\(--rd-redline-length\);[^}]*border-inline: 1px solid currentColor/);
    assert.match(before[1].toString(), /\.rd-redline-metric--region-padding \{ --rd-redline-length: var\(--rd-layout-region-padding\); \}/);
    assert.match(before[1].toString(), /--rd-review-redline-label-bg: rgba\(255, 255, 255, 0\.72\)/);
    assert.match(before[1].toString(), /\.rd-demo-input-anchor > label \{[^}]*position: absolute;[^}]*transform: translateY\(-50%\)/);
    assert.ok(fs.existsSync(path.join(output, 'assets', 'fonts', 'roboto.ttf')));

    publishDesignLanguageHtml(source, output, {title: 'Fixture Design Language', sourceLabel: 'fixture/design-language.json'});
    assert.deepEqual(
        [fs.readFileSync(htmlPath), fs.readFileSync(cssPath), fs.readFileSync(path.join(output, 'render-report.json'))],
        before,
    );
});

test('rejects past and future review-layout contracts before publication', () => {
    const base = folder();
    const source = savedSource(base);
    const layoutPath = path.join(path.dirname(source), 'review-layout.json');
    const output = path.join(base, 'prd');

    for (const version of [1, 2, 3, 4, 5, 6, 8]) {
        fs.writeFileSync(layoutPath, `${JSON.stringify({...layoutFixture(), version}, null, 2)}\n`);
        assert.throws(() => publishDesignLanguageHtml(source, output), /Unsupported review layout version; expected 7/);
        assert.equal(fs.existsSync(output), false);
    }
});

test('escapes source text and retains icon labels without rendering internal status', () => {
    const base = folder();
    const source = savedSource(base);
    const document = JSON.parse(fs.readFileSync(source, 'utf8'));
    document.source.description = 'Review <script>alert("x")</script> & continue';
    document.icons[0].accessibleLabel = 'Play <unsafe> & review';
    const html = renderDesignLanguageHtml(document, {title: 'Safety <Review>', layout: layoutFixture(), siteNavigation: true});

    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /Review &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; continue/);
    assert.match(html, /aria-label="Play &lt;unsafe&gt; &amp; review"/);
    assert.doesNotMatch(html, /class="rd-status"|data-status=/);
    assert.match(html, /href="\.\.\/index\.html">Product requirements/);
    assert.match(html, /href="\.\.\/components\/index\.html">Component states/);
});

test('calls out the absence of brand colors separately from the supporting palette', () => {
    const base = folder();
    const source = savedSource(base);
    const document = JSON.parse(fs.readFileSync(source, 'utf8'));
    document.identityPalette.memberIds = [];
    const html = renderDesignLanguageHtml(document, {layout: layoutFixture()});

    assert.match(html, /<h3 class="rd-subheading">Brand colors<\/h3>\s*<p>No application brand colors are specified\.<\/p>/);
    assert.match(html, /<h3 class="rd-subheading">Supporting palette<\/h3>/);
    assert.doesNotMatch(html, /<span class="rd-tag">Brand<\/span>/);
});

test('invalid input leaves the previous valid publication unchanged', () => {
    const base = folder();
    const source = savedSource(base);
    const output = path.join(base, 'prd');
    publishDesignLanguageHtml(source, output);
    const htmlPath = path.join(output, 'design-language', 'index.html');
    const before = fs.readFileSync(htmlPath);
    const layoutPath = path.join(path.dirname(source), 'review-layout.json');
    const savedLayout = fs.readFileSync(layoutPath);
    const invalidLayout = layoutFixture();
    invalidLayout.spacing.fieldGap = -1;
    fs.writeFileSync(layoutPath, `${JSON.stringify(invalidLayout, null, 2)}\n`);
    assert.throws(() => publishDesignLanguageHtml(source, output), /Vertical spacing must reference the scale/);
    assert.deepEqual(fs.readFileSync(htmlPath), before);
    fs.writeFileSync(layoutPath, savedLayout);
    const invalid = JSON.parse(fs.readFileSync(source, 'utf8'));
    invalid.schemaVersion = '0.4';
    fs.writeFileSync(source, `${JSON.stringify(invalid, null, 2)}\n`);

    assert.throws(() => publishDesignLanguageHtml(source, output), /requires exactly|Unsupported (?:design-language )?schemaVersion/);
    assert.deepEqual(fs.readFileSync(htmlPath), before);
});

test('refuses to replace unowned output', () => {
    const base = folder();
    const source = savedSource(base);
    const output = path.join(base, 'prd');
    fs.mkdirSync(path.join(output, 'design-language'), {recursive: true});
    fs.writeFileSync(path.join(output, 'design-language', 'index.html'), '<h1>Owner file</h1>');

    assert.throws(() => publishDesignLanguageHtml(source, output), /unowned generated file/);
    assert.equal(fs.readFileSync(path.join(output, 'design-language', 'index.html'), 'utf8'), '<h1>Owner file</h1>');
});

test('refuses a linked output root', () => {
    const base = folder();
    const source = savedSource(base);
    const actualOutput = path.join(base, 'actual-prd');
    const linkedOutput = path.join(base, 'linked-prd');
    fs.mkdirSync(actualOutput);
    fs.symlinkSync(actualOutput, linkedOutput, process.platform === 'win32' ? 'junction' : 'dir');

    assert.throws(() => publishDesignLanguageHtml(source, linkedOutput), /linked output root/);
    assert.deepEqual(fs.readdirSync(actualOutput), []);
});

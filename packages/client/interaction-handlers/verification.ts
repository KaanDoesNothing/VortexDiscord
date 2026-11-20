import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    type ButtonInteraction,
    type GuildMember,
    type ModalSubmitInteraction
} from "discord.js";
import { DBManager } from "../lib/database";
import { canRequestCaptcha, checkCaptcha, grantVerified, newCaptcha, renderCaptcha } from "../lib/verification";
import { fail, ok } from "../lib/structures/embed";

// "verify:start" on the panel, "verify:answer" under a captcha image.
export class VerifyButtonHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(context, { ...options, name: "VerifyButton", interactionHandlerType: InteractionHandlerTypes.Button });
    }

    public override parse(interaction: ButtonInteraction) {
        return interaction.customId === "verify:start" || interaction.customId === "verify:answer" ? this.some() : this.none();
    }

    public async run(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;
        const { settings } = await DBManager.getGuildConfig(interaction.guildId);
        const rules = settings.verification;
        if (!rules.enabled) return interaction.reply(fail("Verification is turned off on this server."));

        const member = interaction.member as GuildMember;
        if (rules.roleId && member.roles.cache.has(rules.roleId)) return interaction.reply(fail("You're already verified."));

        // Open the answer form.
        if (interaction.customId === "verify:answer") {
            const modal = new ModalBuilder().setCustomId("verify:modal").setTitle("Verification").addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder().setCustomId("code").setLabel("Type the 6 characters from the image").setStyle(TextInputStyle.Short).setMinLength(6).setMaxLength(12).setRequired(true)
                )
            );
            return interaction.showModal(modal);
        }

        if (rules.method === "button") {
            const problem = await grantVerified(member, rules);
            return interaction.reply(problem ? fail(problem) : ok("You're verified. Welcome!", true));
        }

        if (!canRequestCaptcha(interaction.guildId, interaction.user.id)) return interaction.reply(fail("Slow down a little, then try again."));
        const image = await renderCaptcha(newCaptcha(interaction.guildId, interaction.user.id));
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("verify:answer").setLabel("Enter the code").setStyle(ButtonStyle.Primary)
        );
        return interaction.reply({
            content: "Type the characters you see in the image (you have 5 minutes):",
            files: [{ name: "captcha.png", attachment: image }],
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    }
}

// The captcha answer form.
export class VerifyModalHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(context, { ...options, name: "VerifyModal", interactionHandlerType: InteractionHandlerTypes.ModalSubmit });
    }

    public override parse(interaction: ModalSubmitInteraction) {
        return interaction.customId === "verify:modal" ? this.some() : this.none();
    }

    public async run(interaction: ModalSubmitInteraction) {
        if (!interaction.inCachedGuild()) return;
        const { settings } = await DBManager.getGuildConfig(interaction.guildId);

        const result = checkCaptcha(interaction.guildId, interaction.user.id, interaction.fields.getTextInputValue("code"));
        if (result === "expired") return interaction.reply(fail("That code expired. Press **Verify** again for a new one."));
        if (result === "wrong") return interaction.reply(fail("That's not right. Press **Verify** again for a new code."));

        const problem = await grantVerified(interaction.member as GuildMember, settings.verification);
        return interaction.reply(problem ? fail(problem) : ok("You're verified. Welcome!", true));
    }
}

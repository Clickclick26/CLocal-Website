// CLocal design tokens — exact values from the landing page.
// Use this ThemeData / ColorScheme in Flutter / FlutterFlow custom code.

import 'package:flutter/material.dart';

class CLocalColors {
  static const Color teal = Color(0xFF008080);
  static const Color sage = Color(0xFF77DD77);
  static const Color turquoise = Color(0xFF00FFFF);

  static const Color ink = Color(0xFF1A2E2E);
  static const Color muted = Color(0xFF5A7373);
  static const Color cream = Color(0xFFF4FBF8);
  static const Color white = Color(0xFFFFFFFF);
  static const Color card = Color(0xD1FFFFFF); // ~82% white

  static const Color border = Color(0x14008080); // ~8% teal
  static const Color washSage = Color(0x5977DD77); // ~35%
  static const Color washTeal = Color(0x1A008080); // ~10%
  static const Color washTurquoise = Color(0x3800FFFF); // ~22%

  static const Color roleConsumer = teal;
  static const Color roleCreator = sage;
  static const Color roleBusiness = turquoise;

  static const LinearGradient gradText = LinearGradient(
    begin: Alignment(-0.8, 0),
    end: Alignment(0.8, 0),
    colors: [Color(0xFF008080), Color(0xFF00B3B3), Color(0xFF00FFFF)],
    stops: [0.0, 0.45, 1.0],
  );

  static const LinearGradient gradCta = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF008080), Color(0xFF00B8B8)],
  );

  static const LinearGradient gradAppIcon = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF008080), Color(0xFF00E0E0)],
  );
}

class CLocalRadii {
  static const double card = 28;
  static const double cardLg = 32;
  static const double md = 16;
  static const double sm = 14;
  static const double pill = 999;
  static const double icon = 16;

  static final BorderRadius cardBr = BorderRadius.circular(card);
  static final BorderRadius pillBr = BorderRadius.circular(pill);
  static final BorderRadius mdBr = BorderRadius.circular(md);
  static final BorderRadius smBr = BorderRadius.circular(sm);
  static final BorderRadius iconBr = BorderRadius.circular(icon);
}

class CLocalShadows {
  static List<BoxShadow> soft = [
    BoxShadow(
      color: const Color(0xFF008080).withValues(alpha: 0.10),
      blurRadius: 30,
      offset: const Offset(0, 10),
    ),
  ];

  static List<BoxShadow> deep = [
    BoxShadow(
      color: const Color(0xFF008080).withValues(alpha: 0.12),
      blurRadius: 50,
      offset: const Offset(0, 20),
    ),
  ];

  static List<BoxShadow> cta = [
    BoxShadow(
      color: const Color(0xFF008080).withValues(alpha: 0.28),
      blurRadius: 24,
      offset: const Offset(0, 10),
    ),
  ];
}

class CLocalTypography {
  // Pair with google_fonts: Nunito + Caveat
  static const String fontUi = 'Nunito';
  static const String fontHand = 'Caveat';

  static TextStyle h1 = const TextStyle(
    fontFamily: fontUi,
    fontWeight: FontWeight.w800,
    fontSize: 40,
    height: 1.15,
    letterSpacing: -0.02 * 16,
    color: CLocalColors.ink,
  );

  static TextStyle h2 = const TextStyle(
    fontFamily: fontUi,
    fontWeight: FontWeight.w800,
    fontSize: 32,
    height: 1.15,
    letterSpacing: -0.02 * 16,
    color: CLocalColors.ink,
  );

  static TextStyle h3 = const TextStyle(
    fontFamily: fontUi,
    fontWeight: FontWeight.w800,
    fontSize: 20,
    height: 1.15,
    color: CLocalColors.ink,
  );

  static TextStyle body = const TextStyle(
    fontFamily: fontUi,
    fontWeight: FontWeight.w400,
    fontSize: 16,
    height: 1.55,
    color: CLocalColors.muted,
  );

  static TextStyle eyebrow = const TextStyle(
    fontFamily: fontUi,
    fontWeight: FontWeight.w700,
    fontSize: 15,
    letterSpacing: 0.04 * 16,
    color: CLocalColors.teal,
  );

  static TextStyle hand = const TextStyle(
    fontFamily: fontHand,
    fontWeight: FontWeight.w600,
    fontSize: 24,
    height: 1.25,
    color: CLocalColors.ink,
  );

  static TextStyle button = const TextStyle(
    fontFamily: fontUi,
    fontWeight: FontWeight.w700,
    fontSize: 15,
    color: CLocalColors.white,
  );
}

ThemeData clocalTheme() {
  final base = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    fontFamily: CLocalTypography.fontUi,
    scaffoldBackgroundColor: CLocalColors.cream,
    colorScheme: const ColorScheme.light(
      primary: CLocalColors.teal,
      secondary: CLocalColors.sage,
      tertiary: CLocalColors.turquoise,
      surface: CLocalColors.white,
      onPrimary: CLocalColors.white,
      onSecondary: CLocalColors.ink,
      onSurface: CLocalColors.ink,
      outline: CLocalColors.border,
    ),
  );

  return base.copyWith(
    textTheme: base.textTheme.copyWith(
      displayLarge: CLocalTypography.h1,
      headlineMedium: CLocalTypography.h2,
      titleLarge: CLocalTypography.h3,
      bodyMedium: CLocalTypography.body,
      labelLarge: CLocalTypography.button,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xB8FFFFFF),
      foregroundColor: CLocalColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ButtonStyle(
        backgroundColor: WidgetStateProperty.all(CLocalColors.teal),
        foregroundColor: WidgetStateProperty.all(CLocalColors.white),
        elevation: WidgetStateProperty.all(0),
        padding: WidgetStateProperty.all(
          const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        ),
        shape: WidgetStateProperty.all(
          RoundedRectangleBorder(borderRadius: CLocalRadii.pillBr),
        ),
        textStyle: WidgetStateProperty.all(CLocalTypography.button),
        shadowColor: WidgetStateProperty.all(
          CLocalColors.teal.withValues(alpha: 0.28),
        ),
      ),
    ),
    cardTheme: CardThemeData(
      color: CLocalColors.card,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: CLocalRadii.cardBr,
        side: const BorderSide(color: CLocalColors.border),
      ),
      shadowColor: CLocalColors.teal.withValues(alpha: 0.10),
    ),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: CLocalColors.washSage,
      labelStyle: const TextStyle(
        fontFamily: CLocalTypography.fontUi,
        fontWeight: FontWeight.w700,
        color: CLocalColors.teal,
      ),
      shape: RoundedRectangleBorder(borderRadius: CLocalRadii.pillBr),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: CLocalColors.white,
      border: OutlineInputBorder(
        borderRadius: CLocalRadii.mdBr,
        borderSide: const BorderSide(color: CLocalColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: CLocalRadii.mdBr,
        borderSide: const BorderSide(color: CLocalColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: CLocalRadii.mdBr,
        borderSide: const BorderSide(color: CLocalColors.teal, width: 1.5),
      ),
    ),
  );
}

/// Pill CTA with exact landing-page gradient fill.
class CLocalPillButton extends StatelessWidget {
  const CLocalPillButton({
    super.key,
    required this.label,
    required this.onPressed,
  });

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: CLocalColors.gradCta,
        borderRadius: CLocalRadii.pillBr,
        boxShadow: CLocalShadows.cta,
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: CLocalRadii.pillBr,
          onTap: onPressed,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            child: Text(label, style: CLocalTypography.button),
          ),
        ),
      ),
    );
  }
}
